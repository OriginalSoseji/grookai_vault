# Card Visual Fact Graph V2 Review Packet

Generated rows: 21
Validation failures: 4
Skipped images: 0
Estimated cost USD: 0.2540672

## Rows

### GV-PK-JPN-M5-113 - Mega Chandelure ex

- Branch: `pokemon`
- Review status: `needs_review`
- Description confidence: `0.98`
- Attribute confidence: `0.97`
- Cost USD: `0.0110056`
- Artwork observations: `11`
- Card UI / print-marker observations: `10`
- Card UI module evidence references: `5`
- Derived digest: Fact digest. Scene subjects: Mega Chandelure. Semantic facts: floating. Counts: arms with flames: 2.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Chandelure Pokemon | mega chandeler pokemon | scene_subject | foreground | salient | 0.99 |
| head region of Mega Chandelure | head | creature_anatomy | foreground | salient | 0.99 |
| arms of Mega Chandelure | arms | creature_anatomy | foreground | salient | 0.99 |
| body/lamp region of Mega Chandelure | body | creature_anatomy | foreground | salient | 0.99 |
| flame on right arm | flame | creature_anatomy | foreground | salient | 0.95 |
| flame on left arm | flame | creature_anatomy | foreground | salient | 0.95 |
| purple glowing orb in body/lamp area | purple glowing orb | creature_anatomy | foreground | salient | 0.98 |
| floating pose | floating | creature_anatomy | foreground | salient | 0.98 |
| diagonal orientation | diagonal | creature_anatomy | foreground | salient | 0.97 |
| color palette includes black, purple, yellow, and white | black purple yellow white | color_and_light | foreground | salient | 0.99 |
| background includes dark smoky purple and black gradient | dark smoky purple black gradient background | environment | background | salient | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text in Japanese メガシャンデラ ex | card_name_text | top center | fully_visible | 0.98 |
| HP 350 | hp_text | top right | fully_visible | 0.99 |
| Psychic type symbol | card_ui_symbol | top left corner | fully_visible | 0.99 |
| set symbol in bottom right corner of card | set_symbol | bottom right | fully_visible | 0.95 |
| collector number 113/081 SAR | collector_number | bottom center | fully_visible | 0.97 |
| Weakness x2 symbol | card_ui_symbol | bottom left | fully_visible | 0.95 |
| Resistance symbol -30 | card_ui_symbol | bottom left near weakness | fully_visible | 0.95 |
| Retreat cost : two colorless energy symbols | card_ui_symbol | bottom right near set symbol | fully_visible | 0.95 |
| Text box for ability or special effect with red heading | card_ui_text | middle left below name | fully_visible | 0.95 |
| Attack text with damage number 130+ | card_ui_text | middle right center | fully_visible | 0.95 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | This card shows a Mega Chandelure Pokemon as a physically present scene subject | obs_subject_001 | 0.99 |
| fact_creature_anatomy_001 | creature_anatomy | The Mega Chandelure has a head region visible | obs_body_region_001 | 0.99 |
| fact_creature_anatomy_002 | creature_anatomy | The Mega Chandelure has arms visible with flame on each arm | obs_body_region_002, obs_feature_001, obs_feature_002 | 0.95 |
| fact_creature_anatomy_003 | creature_anatomy | The Mega Chandelure has a lamp-like body with a glowing purple orb inside | obs_body_region_003, obs_feature_003 | 0.98 |
| fact_creature_anatomy_004 | creature_anatomy | Mega Chandelure is floating with diagonal orientation | obs_orientation_001, obs_pose_001 | 0.98 |
| fact_color_and_light_001 | color_and_light | Color palette includes black, purple, yellow and white | obs_coloration_001 | 0.99 |
| fact_environment_001 | environment | Background is dark smoky purple and black gradient | obs_background_001 | 0.95 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_and_print_markers_001 | Card name text shows Japanese メガシャンデラ ex | obs_card_ui_name_001 | 0.98 |
| fact_card_ui_and_print_markers_002 | HP text is 350 | obs_card_ui_hp_001 | 0.99 |
| fact_card_ui_and_print_markers_003 | Set symbol visible in bottom right corner | obs_card_ui_set_001 | 0.95 |
| fact_card_ui_and_print_markers_004 | Collector number 113/081 SAR | obs_card_ui_number_001 | 0.97 |
| fact_card_ui_and_print_markers_005 | Rarity symbol SAR visible | obs_card_ui_number_001 | 0.97 |
| fact_card_ui_and_print_markers_006 | Weakness symbol of x2 visible | obs_card_ui_weakness_001 | 0.95 |
| fact_card_ui_and_print_markers_007 | Resistance symbol -30 visible | obs_card_ui_resistance_001 | 0.95 |
| fact_card_ui_and_print_markers_008 | Retreat cost two colorless energy symbols | obs_card_ui_retreat_001 | 0.95 |
| fact_card_ui_and_print_markers_009 | Visible ability text box with red heading area | obs_card_ui_ability_001 | 0.95 |
| fact_card_ui_and_print_markers_010 | Attack text with damage number 130+ | obs_card_ui_attack_001 | 0.95 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_and_print_markers_001",
    "fact_card_ui_and_print_markers_002",
    "fact_card_ui_and_print_markers_003",
    "fact_card_ui_and_print_markers_004",
    "fact_card_ui_and_print_markers_005",
    "fact_card_ui_and_print_markers_006",
    "fact_card_ui_and_print_markers_007",
    "fact_card_ui_and_print_markers_008",
    "fact_card_ui_and_print_markers_009",
    "fact_card_ui_and_print_markers_010"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_name_001"
  ],
  "hp_text_observation_ids": [
    "obs_card_ui_hp_001"
  ],
  "collector_number_observation_ids": [
    "obs_card_ui_number_001"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_set_001"
  ],
  "rarity_mark_observation_ids": [
    "obs_card_ui_number_001"
  ],
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
| human_appearance | not_applicable | none | not_applicable |  |
| creature_anatomy | complete | low | high |  |
| clothing | not_applicable | none | not_applicable |  |
| objects_and_props | none_visible | none | not_applicable |  |
| environment | likely_complete | low | medium |  |
| composition | none_visible | none | not_applicable |  |
| color_and_light | complete | none | high |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | complete | none | high |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | none_visible | none | not_applicable |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| sem_fact_001 | action | floating | obs_subject_001 | obs_orientation_001, obs_pose_001 | floating | 0.98 |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| arms with flames | exact | 2 | obs_feature_001, obs_feature_002 | 0.95 |

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
| diagonal pose | obs_orientation_001 |
| purple glowing orb | obs_feature_003 |
| flames on arms | obs_feature_001, obs_feature_002 |
| dark smoky purple black gradient background | obs_background_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| circular motif | obs_feature_003 | deterministic_rule | 0.98 |
| diagonal composition | obs_orientation_001 | deterministic_rule | 0.97 |
| diagonal orientation | obs_orientation_001, obs_pose_001, obs_subject_001 | deterministic_rule | 0.99 |
| flame | obs_feature_001, obs_feature_002, obs_feature_003 | deterministic_rule | 0.95 |
| floating | obs_orientation_001, obs_pose_001, obs_subject_001 | deterministic_rule | 0.99 |
| glowing highlights | obs_feature_003 | deterministic_rule | 0.98 |
| smoke | obs_background_001 | deterministic_rule | 0.95 |
| spiral motif | obs_feature_001, obs_feature_002 | deterministic_rule | 0.92 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Chandelure. Semantic facts: floating. Counts: arms with flames: 2.
- Quality flags: `potential_module_review_conflicts_with_entries`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "Mega Chandelure Pokemon",
      "normalized_label": "mega chandeler pokemon",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_region_001",
      "kind": "creature_anatomy",
      "label": "head region of Mega Chandelure",
      "normalized_label": "head",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_region_002",
      "kind": "creature_anatomy",
      "label": "arms of Mega Chandelure",
      "normalized_label": "arms",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_region_003",
      "kind": "creature_anatomy",
      "label": "body/lamp region of Mega Chandelure",
      "normalized_label": "body",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_feature_001",
      "kind": "creature_anatomy",
      "label": "flame on right arm",
      "normalized_label": "flame",
      "scene_layer": "foreground",
      "frame_position": "right",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_feature_002",
      "kind": "creature_anatomy",
      "label": "flame on left arm",
      "normalized_label": "flame",
      "scene_layer": "foreground",
      "frame_position": "left",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_feature_003",
      "kind": "creature_anatomy",
      "label": "purple glowing orb in body/lamp area",
      "normalized_label": "purple glowing orb",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_001",
      "kind": "creature_anatomy",
      "label": "floating pose",
      "normalized_label": "floating",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_orientation_001",
      "kind": "creature_anatomy",
      "label": "diagonal orientation",
      "normalized_label": "diagonal",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_coloration_001",
      "kind": "color_and_light",
      "label": "color palette includes black, purple, yellow, and white",
      "normalized_label": "black purple yellow white",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_background_001",
      "kind": "environment",
      "label": "background includes dark smoky purple and black gradient",
      "normalized_label": "dark smoky purple black gradient background",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_001",
      "kind": "card_name_text",
      "label": "card name text in Japanese メガシャンデラ ex",
      "normalized_label": "card name mega chandeler ex japonese",
      "scene_layer": "interface",
      "frame_position": "top center",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_hp_001",
      "kind": "hp_text",
      "label": "HP 350",
      "normalized_label": "hp 350",
      "scene_layer": "interface",
      "frame_position": "top right",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_type_001",
      "kind": "card_ui_symbol",
      "label": "Psychic type symbol",
      "normalized_label": "psychic type symbol",
      "scene_layer": "interface",
      "frame_position": "top left corner",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_001",
      "kind": "set_symbol",
      "label": "set symbol in bottom right corner of card",
      "normalized_label": "set symbol",
      "scene_layer": "interface",
      "frame_position": "bottom right",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_number_001",
      "kind": "collector_number",
      "label": "collector number 113/081 SAR",
      "normalized_label": "113 slash 081 SAR",
      "scene_layer": "interface",
      "frame_position": "bottom center",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_weakness_001",
      "kind": "card_ui_symbol",
      "label": "Weakness x2 symbol",
      "normalized_label": "weakness x2",
      "scene_layer": "interface",
      "frame_position": "bottom left",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_resistance_001",
      "kind": "card_ui_symbol",
      "label": "Resistance symbol -30",
      "normalized_label": "resistance minus 30",
      "scene_layer": "interface",
      "frame_position": "bottom left near weakness",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_retreat_001",
      "kind": "card_ui_symbol",
      "label": "Retreat cost : two colorless energy symbols",
      "normalized_label": "retreat cost two colorless",
      "scene_layer": "interface",
      "frame_position": "bottom right near set symbol",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_ability_001",
      "kind": "card_ui_text",
      "label": "Text box for ability or special effect with red heading",
      "normalized_label": "ability text red heading",
      "scene_layer": "interface",
      "frame_position": "middle left below name",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_attack_001",
      "kind": "card_ui_text",
      "label": "Attack text with damage number 130+",
      "normalized_label": "attack text damage 130 plus",
      "scene_layer": "interface",
      "frame_position": "middle right center",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_001",
      "module": "subjects",
      "field_path": "scene_subject.identity",
      "claim": "This card shows a Mega Chandelure Pokemon as a physically present scene subject",
      "value": "Mega Chandelure",
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
      "claim": "The Mega Chandelure has a head region visible",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_body_region_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_002",
      "module": "creature_anatomy",
      "field_path": "body_regions.arms",
      "claim": "The Mega Chandelure has arms visible with flame on each arm",
      "value": "visible with flames",
      "supporting_observation_ids": [
        "obs_body_region_002",
        "obs_feature_001",
        "obs_feature_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_003",
      "module": "creature_anatomy",
      "field_path": "body_regions.body",
      "claim": "The Mega Chandelure has a lamp-like body with a glowing purple orb inside",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_body_region_003",
        "obs_feature_003"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_004",
      "module": "creature_anatomy",
      "field_path": "pose.orientation",
      "claim": "Mega Chandelure is floating with diagonal orientation",
      "value": "floating diagonal",
      "supporting_observation_ids": [
        "obs_orientation_001",
        "obs_pose_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_color_and_light_001",
      "module": "color_and_light",
      "field_path": "palette",
      "claim": "Color palette includes black, purple, yellow and white",
      "value": "black purple yellow white",
      "supporting_observation_ids": [
        "obs_coloration_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "background",
      "claim": "Background is dark smoky purple and black gradient",
      "value": "dark smoky purple black gradient",
      "supporting_observation_ids": [
        "obs_background_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "Card name text shows Japanese メガシャンデラ ex",
      "value": "メガシャンデラ ex",
      "supporting_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_002",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text",
      "claim": "HP text is 350",
      "value": "350",
      "supporting_observation_ids": [
        "obs_card_ui_hp_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_003",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "Set symbol visible in bottom right corner",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_card_ui_set_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_004",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "Collector number 113/081 SAR",
      "value": "113/081 SAR",
      "supporting_observation_ids": [
        "obs_card_ui_number_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_005",
      "module": "card_ui_and_print_markers",
      "field_path": "rarity_mark",
      "claim": "Rarity symbol SAR visible",
      "value": "SAR",
      "supporting_observation_ids": [
        "obs_card_ui_number_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_006",
      "module": "card_ui_and_print_markers",
      "field_path": "weakness_mark",
      "claim": "Weakness symbol of x2 visible",
      "value": "x2",
      "supporting_observation_ids": [
        "obs_card_ui_weakness_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_007",
      "module": "card_ui_and_print_markers",
      "field_path": "resistance_mark",
      "claim": "Resistance symbol -30 visible",
      "value": "-30",
      "supporting_observation_ids": [
        "obs_card_ui_resistance_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_008",
      "module": "card_ui_and_print_markers",
      "field_path": "retreat_cost",
      "claim": "Retreat cost two colorless energy symbols",
      "value": "two colorless",
      "supporting_observation_ids": [
        "obs_card_ui_retreat_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_009",
      "module": "card_ui_and_print_markers",
      "field_path": "ability_text_box",
      "claim": "Visible ability text box with red heading area",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_card_ui_ability_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_010",
      "module": "card_ui_and_print_markers",
      "field_path": "attack_text",
      "claim": "Attack text with damage number 130+",
      "value": "130+",
      "supporting_observation_ids": [
        "obs_card_ui_attack_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "Mega Chandelure",
      "identity_confidence": 0.99,
      "anatomy": [
        "arms",
        "body",
        "head"
      ],
      "physical_features": [
        "flames on arms",
        "purple glowing orb"
      ],
      "pose": [
        "floating"
      ],
      "orientation": "diagonal",
      "action_state": [],
      "facial_evidence": {
        "eyes": "not visible",
        "mouth": "not visible",
        "eyebrows": "not visible",
        "face_position": "center",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [],
      "colors": [
        "black",
        "purple",
        "white",
        "yellow"
      ],
      "visibility": "fully_visible"
    }
  ],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [
    {
      "count_id": "count_flames_001",
      "normalized_label": "arms with flames",
      "count_type": "exact",
      "exact_count": 2,
      "estimated_min": 0,
      "estimated_max": 0,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_feature_001",
        "obs_feature_002"
      ],
      "scene_layer": "foreground",
      "confidence": 0.95
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_body_region_001",
      "obs_body_region_002",
      "obs_body_region_003",
      "obs_coloration_001",
      "obs_feature_001",
      "obs_feature_002",
      "obs_feature_003",
      "obs_orientation_001",
      "obs_pose_001",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_background_001"
    ]
  },
  "environment": {
    "setting": [],
    "indoor_outdoor": "",
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
      "white",
      "yellow"
    ],
    "lighting": [
      "glowing orb lighting",
      "highlight on flames"
    ],
    "shadows": [
      "shadows consistent with floating pose"
    ],
    "highlights": [
      "highlight on purple orb and flames"
    ],
    "composition": [
      "centered subject",
      "diagonal pose"
    ],
    "camera_angle": "front",
    "framing": "head and body full frame",
    "cropping": [],
    "depth": "visible depth in arms and body",
    "motion_cues": [],
    "motifs": [
      "swirling flames motif"
    ],
    "repeated_shapes": [
      "spiral flames on arms"
    ],
    "style_cues": [
      "dark lighting"
    ],
    "supporting_observation_ids": [
      "obs_background_001",
      "obs_coloration_001",
      "obs_feature_001",
      "obs_feature_002",
      "obs_feature_003",
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
        "fact_creature_anatomy_004"
      ],
      "body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "feature": "",
          "visibility": "visible",
          "colors": [],
          "details": [
            "visible head region"
          ],
          "supporting_observation_ids": [
            "obs_body_region_001"
          ],
          "confidence": 0.99
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "arms",
          "feature": "",
          "visibility": "visible",
          "colors": [
            "orange",
            "yellow"
          ],
          "details": [
            "arms with flames"
          ],
          "supporting_observation_ids": [
            "obs_body_region_002",
            "obs_feature_001",
            "obs_feature_002"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "body",
          "feature": "",
          "visibility": "visible",
          "colors": [
            "purple"
          ],
          "details": [
            "lamp body with purple glowing orb"
          ],
          "supporting_observation_ids": [
            "obs_body_region_003",
            "obs_feature_003"
          ],
          "confidence": 0.98
        }
      ],
      "physical_features": [],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "floating"
          ],
          "orientation": "diagonal",
          "action_state": [],
          "supporting_observation_ids": [
            "obs_orientation_001",
            "obs_pose_001"
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
        "fact_color_and_light_001"
      ],
      "observation_ids": [
        "obs_coloration_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": []
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_ui_and_print_markers_001",
        "fact_card_ui_and_print_markers_002",
        "fact_card_ui_and_print_markers_003",
        "fact_card_ui_and_print_markers_004",
        "fact_card_ui_and_print_markers_005",
        "fact_card_ui_and_print_markers_006",
        "fact_card_ui_and_print_markers_007",
        "fact_card_ui_and_print_markers_008",
        "fact_card_ui_and_print_markers_009",
        "fact_card_ui_and_print_markers_010"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "hp_text_observation_ids": [
        "obs_card_ui_hp_001"
      ],
      "collector_number_observation_ids": [
        "obs_card_ui_number_001"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_set_001"
      ],
      "rarity_mark_observation_ids": [
        "obs_card_ui_number_001"
      ],
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
        "count_flames_001"
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
        "floating",
        "diagonal pose",
        "purple glowing orb",
        "flames on arms",
        "dark smoky purple black gradient background"
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
      "review_status": "not_applicable",
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
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
      "abstentions": []
    }
  ],
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "sem_fact_001",
      "category": "action",
      "label": "floating",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_orientation_001",
        "obs_pose_001"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [],
        "eyebrows": [],
        "facial_features": [],
        "body_language": [],
        "body_position": [
          "floating"
        ],
        "motion_state": [],
        "environment": [],
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
      "term": "floating",
      "supporting_observation_ids": [
        "obs_pose_001",
        "obs_subject_001"
      ]
    },
    {
      "term": "diagonal pose",
      "supporting_observation_ids": [
        "obs_orientation_001"
      ]
    },
    {
      "term": "purple glowing orb",
      "supporting_observation_ids": [
        "obs_feature_003"
      ]
    },
    {
      "term": "flames on arms",
      "supporting_observation_ids": [
        "obs_feature_001",
        "obs_feature_002"
      ]
    },
    {
      "term": "dark smoky purple black gradient background",
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
          "obs_feature_003"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "diagonal composition",
        "source_observation_ids": [
          "obs_orientation_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
      },
      {
        "concept": "diagonal orientation",
        "source_observation_ids": [
          "obs_orientation_001",
          "obs_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "flame",
        "source_observation_ids": [
          "obs_feature_001",
          "obs_feature_002",
          "obs_feature_003"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "floating",
        "source_observation_ids": [
          "obs_orientation_001",
          "obs_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "glowing highlights",
        "source_observation_ids": [
          "obs_feature_003"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "smoke",
        "source_observation_ids": [
          "obs_background_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "spiral motif",
        "source_observation_ids": [
          "obs_feature_001",
          "obs_feature_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-118 - Mega Darkrai ex

- Branch: `pokemon`
- Review status: `needs_review`
- Description confidence: `0.95`
- Attribute confidence: `0.9`
- Cost USD: `0.0109516`
- Artwork observations: `10`
- Card UI / print-marker observations: `8`
- Card UI module evidence references: `7`
- Derived digest: Fact digest. Scene subjects: Mega Darkrai. Visible observations: body central glowing orb, multiple long curved spikes tendrils back, yellow glowing body dark inner features, sharp angular collar mane neck, glowing eyes slits, spiky tail downward, dark abstract background golden motif, yellow stars spark shapes behind. Semantic facts: floating.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Darkrai | mega darkrai | scene_subject | foreground | primary | 0.98 |
| body central glowing orb | body central glowing orb | feature | foreground | high | 0.9 |
| multiple long curved spikes or tendrils on back | multiple long curved spikes tendrils back | feature | foreground | high | 0.88 |
| yellow glowing body with dark inner features | yellow glowing body dark inner features | feature | foreground | high | 0.95 |
| sharp angular collar or mane around neck | sharp angular collar mane neck | feature | foreground | high | 0.92 |
| floating upright pose | floating upright pose | pose_orientation | foreground | primary | 0.9 |
| glowing eyes with slits | glowing eyes slits | physical_feature | foreground | high | 0.85 |
| spiky tail extending downwards | spiky tail downward | tail | foreground | medium | 0.8 |
| dark abstract background with golden motif | dark abstract background golden motif | environment | background | medium | 0.95 |
| yellow stars or spark shapes behind Pokemon | yellow stars spark shapes behind | object | background | medium | 0.9 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| メガダークライex (Mega Darkrai ex) | card_name_text | top center | visible | 1 |
| HP 280 | hp_text | top right | visible | 1 |
| Dark Energy symbol | energy_symbol | top right near HP | visible | 1 |
| ナイトレイド (Night Raid) and アビスアイ (Abyss Eye) attack names | attack_text | center left | visible | 1 |
| 118/081 | collector_number | bottom left | visible | 0.98 |
| jpn-m5 symbol | set_symbol | bottom left near collector number | visible | 0.95 |
| Illus. 5ban Graphics | illustrator_text | bottom left above collector number | visible | 0.95 |
| ©2026 Pokémon/Nintendo/Creatures/GAME FREAK. | copyright_line | bottom | visible | 1 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | subject identity | obs_subject_001 | 0.98 |
| fact_creature_anatomy_001 | creature_anatomy | body has central glowing orb | obs_creature_anatomy_001 | 0.9 |
| fact_creature_anatomy_002 | creature_anatomy | multiple long curved spikes or tendrils on back | obs_creature_anatomy_002 | 0.88 |
| fact_creature_anatomy_003 | creature_anatomy | body is yellow glowing with dark inner features | obs_creature_anatomy_003 | 0.95 |
| fact_creature_anatomy_004 | creature_anatomy | sharp angular collar or mane around neck | obs_creature_anatomy_004 | 0.92 |
| fact_creature_anatomy_005 | creature_anatomy | pose is floating upright | obs_creature_anatomy_005 | 0.9 |
| fact_creature_anatomy_006 | creature_anatomy | eyes glowing with slits | obs_creature_anatomy_006 | 0.85 |
| fact_creature_anatomy_007 | creature_anatomy | spiky tail extending downwards | obs_creature_anatomy_007 | 0.8 |
| fact_environment_001 | environment | background is dark abstract with golden motif | obs_environment_001 | 0.95 |
| fact_objects_and_props_001 | objects_and_props | yellow stars or spark shapes behind subject | obs_objects_001 | 0.9 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_and_print_markers_001 | card name text is メガダークライex (Mega Darkrai ex) | obs_card_ui_text_001 | 1 |
| fact_card_ui_and_print_markers_002 | HP text is 280 | obs_card_ui_text_002 | 1 |
| fact_card_ui_and_print_markers_003 | Dark Energy symbol present near HP | obs_card_ui_symbol_001 | 1 |
| fact_card_ui_and_print_markers_004 | attacks included ナイトレイド and アビスアイ | obs_card_ui_text_003 | 1 |
| fact_card_ui_and_print_markers_005 | collector number is 118/081 | obs_card_ui_text_004 | 0.98 |
| fact_card_ui_and_print_markers_006 | set symbol visible with code jpn-m5 | obs_card_ui_text_005 | 0.95 |
| fact_card_ui_and_print_markers_007 | illustrator text is Illus. 5ban Graphics | obs_card_ui_text_006 | 0.95 |
| fact_card_ui_and_print_markers_008 | copyright line is ©2026 Pokémon/Nintendo/Creatures/GAME FREAK | obs_card_ui_text_007 | 1 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_and_print_markers_001",
    "fact_card_ui_and_print_markers_002",
    "fact_card_ui_and_print_markers_003",
    "fact_card_ui_and_print_markers_004",
    "fact_card_ui_and_print_markers_005",
    "fact_card_ui_and_print_markers_006",
    "fact_card_ui_and_print_markers_007",
    "fact_card_ui_and_print_markers_008"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_text_001"
  ],
  "hp_text_observation_ids": [
    "obs_card_ui_text_002"
  ],
  "collector_number_observation_ids": [
    "obs_card_ui_text_004"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_text_005"
  ],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [
    "obs_card_ui_text_007"
  ],
  "bottom_line_text_observation_ids": [],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [
    "obs_card_ui_symbol_001"
  ],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_card_ui_text_006"
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
| objects_and_props | complete | low | high |  |
| environment | complete | none | high |  |
| composition | complete | low | high |  |
| color_and_light | complete | low | high |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | not_applicable | none | not_applicable |  |
| fact_grounded_search_terms | complete | none | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| semfact_002 | state | floating | obs_subject_001 | obs_creature_anatomy_005 | floating upright pose floating | 0.9 |

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
| yellow glowing body | obs_creature_anatomy_003 |
| floating upright pose | obs_creature_anatomy_005 |
| dark background | obs_environment_001 |
| golden motif | obs_environment_001 |
| yellow stars | obs_objects_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| centered composition | obs_creature_anatomy_001 | deterministic_rule | 0.92 |
| circular motif | obs_creature_anatomy_001 | deterministic_rule | 0.92 |
| downward orientation | obs_creature_anatomy_007 | deterministic_rule | 0.8 |
| floating | obs_creature_anatomy_005, obs_subject_001 | deterministic_rule | 0.98 |
| glowing highlights | obs_creature_anatomy_001, obs_creature_anatomy_003, obs_creature_anatomy_006 | deterministic_rule | 0.95 |
| spark | obs_objects_001 | deterministic_rule | 0.9 |
| upright orientation | obs_subject_001 | deterministic_rule | 0.98 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Darkrai. Visible observations: body central glowing orb, multiple long curved spikes tendrils back, yellow glowing body dark inner features, sharp angular collar mane neck, glowing eyes slits, spiky tail downward, dark abstract background golden motif, yellow stars spark shapes behind. Semantic facts: floating.
- Quality flags: `potential_count_reference_inconsistent`, `potential_overconfident_ambiguous_setting`, `potential_speculative_setting_language`
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
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_001",
      "kind": "feature",
      "label": "body central glowing orb",
      "normalized_label": "body central glowing orb",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_002",
      "kind": "feature",
      "label": "multiple long curved spikes or tendrils on back",
      "normalized_label": "multiple long curved spikes tendrils back",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.88,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_003",
      "kind": "feature",
      "label": "yellow glowing body with dark inner features",
      "normalized_label": "yellow glowing body dark inner features",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_004",
      "kind": "feature",
      "label": "sharp angular collar or mane around neck",
      "normalized_label": "sharp angular collar mane neck",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_005",
      "kind": "pose_orientation",
      "label": "floating upright pose",
      "normalized_label": "floating upright pose",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_006",
      "kind": "physical_feature",
      "label": "glowing eyes with slits",
      "normalized_label": "glowing eyes slits",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.85,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_007",
      "kind": "tail",
      "label": "spiky tail extending downwards",
      "normalized_label": "spiky tail downward",
      "scene_layer": "foreground",
      "frame_position": "bottom",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.8,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "dark abstract background with golden motif",
      "normalized_label": "dark abstract background golden motif",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_objects_001",
      "kind": "object",
      "label": "yellow stars or spark shapes behind Pokemon",
      "normalized_label": "yellow stars spark shapes behind",
      "scene_layer": "background",
      "frame_position": "upper center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_001",
      "kind": "card_name_text",
      "label": "メガダークライex (Mega Darkrai ex)",
      "normalized_label": "mega darkrai ex",
      "scene_layer": "interface",
      "frame_position": "top center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_002",
      "kind": "hp_text",
      "label": "HP 280",
      "normalized_label": "HP 280",
      "scene_layer": "interface",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_symbol_001",
      "kind": "energy_symbol",
      "label": "Dark Energy symbol",
      "normalized_label": "dark energy symbol",
      "scene_layer": "interface",
      "frame_position": "top right near HP",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_003",
      "kind": "attack_text",
      "label": "ナイトレイド (Night Raid) and アビスアイ (Abyss Eye) attack names",
      "normalized_label": "night raid, abyss eye attack names",
      "scene_layer": "interface",
      "frame_position": "center left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_004",
      "kind": "collector_number",
      "label": "118/081",
      "normalized_label": "118/81",
      "scene_layer": "interface",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_005",
      "kind": "set_symbol",
      "label": "jpn-m5 symbol",
      "normalized_label": "jpn-m5",
      "scene_layer": "interface",
      "frame_position": "bottom left near collector number",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_006",
      "kind": "illustrator_text",
      "label": "Illus. 5ban Graphics",
      "normalized_label": "illus 5ban graphics",
      "scene_layer": "interface",
      "frame_position": "bottom left above collector number",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_007",
      "kind": "copyright_line",
      "label": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK.",
      "normalized_label": "©2026 pokémon,nintendo,creatures,game freak",
      "scene_layer": "interface",
      "frame_position": "bottom",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_001",
      "module": "subjects",
      "field_path": "scene_subject[0].identity",
      "claim": "subject identity",
      "value": "Mega Darkrai",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_001",
      "module": "creature_anatomy",
      "field_path": "body_features.central_orb",
      "claim": "body has central glowing orb",
      "value": "true",
      "supporting_observation_ids": [
        "obs_creature_anatomy_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_002",
      "module": "creature_anatomy",
      "field_path": "body_features.spikes_tendrils",
      "claim": "multiple long curved spikes or tendrils on back",
      "value": "true",
      "supporting_observation_ids": [
        "obs_creature_anatomy_002"
      ],
      "confidence": 0.88,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_003",
      "module": "creature_anatomy",
      "field_path": "body_color",
      "claim": "body is yellow glowing with dark inner features",
      "value": "yellow with dark inner features",
      "supporting_observation_ids": [
        "obs_creature_anatomy_003"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_004",
      "module": "creature_anatomy",
      "field_path": "body_features.collar",
      "claim": "sharp angular collar or mane around neck",
      "value": "true",
      "supporting_observation_ids": [
        "obs_creature_anatomy_004"
      ],
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_005",
      "module": "creature_anatomy",
      "field_path": "pose_orientation",
      "claim": "pose is floating upright",
      "value": "floating upright",
      "supporting_observation_ids": [
        "obs_creature_anatomy_005"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_006",
      "module": "creature_anatomy",
      "field_path": "eye_feature",
      "claim": "eyes glowing with slits",
      "value": "true",
      "supporting_observation_ids": [
        "obs_creature_anatomy_006"
      ],
      "confidence": 0.85,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_007",
      "module": "creature_anatomy",
      "field_path": "tail.feature",
      "claim": "spiky tail extending downwards",
      "value": "true",
      "supporting_observation_ids": [
        "obs_creature_anatomy_007"
      ],
      "confidence": 0.8,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "background",
      "claim": "background is dark abstract with golden motif",
      "value": "dark abstract golden motif",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_objects_and_props_001",
      "module": "objects_and_props",
      "field_path": "objects",
      "claim": "yellow stars or spark shapes behind subject",
      "value": "yellow stars or sparks",
      "supporting_observation_ids": [
        "obs_objects_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text is メガダークライex (Mega Darkrai ex)",
      "value": "メガダークライex (Mega Darkrai ex)",
      "supporting_observation_ids": [
        "obs_card_ui_text_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_002",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text",
      "claim": "HP text is 280",
      "value": "280",
      "supporting_observation_ids": [
        "obs_card_ui_text_002"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_003",
      "module": "card_ui_and_print_markers",
      "field_path": "energy_symbol",
      "claim": "Dark Energy symbol present near HP",
      "value": "dark energy symbol",
      "supporting_observation_ids": [
        "obs_card_ui_symbol_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_004",
      "module": "card_ui_and_print_markers",
      "field_path": "attack_text",
      "claim": "attacks included ナイトレイド and アビスアイ",
      "value": "Night Raid and Abyss Eye",
      "supporting_observation_ids": [
        "obs_card_ui_text_003"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_005",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "collector number is 118/081",
      "value": "118/081",
      "supporting_observation_ids": [
        "obs_card_ui_text_004"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_006",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "set symbol visible with code jpn-m5",
      "value": "jpn-m5",
      "supporting_observation_ids": [
        "obs_card_ui_text_005"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_007",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator text is Illus. 5ban Graphics",
      "value": "Illus. 5ban Graphics",
      "supporting_observation_ids": [
        "obs_card_ui_text_006"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_008",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line",
      "claim": "copyright line is ©2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "value": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "supporting_observation_ids": [
        "obs_card_ui_text_007"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "Mega Darkrai",
      "identity_confidence": 0.98,
      "anatomy": [
        "body central glowing orb",
        "multiple long curved spikes or tendrils on back",
        "sharp angular collar or mane around neck",
        "yellow glowing body with dark inner features"
      ],
      "physical_features": [
        "glowing eyes with slits",
        "spiky tail extending downwards"
      ],
      "pose": [
        "floating"
      ],
      "orientation": "upright",
      "action_state": [],
      "facial_evidence": {
        "eyes": "glowing eyes with slits",
        "mouth": "not visible",
        "eyebrows": "not visible",
        "face_position": "centered",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [],
      "colors": [
        "dark",
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
      "obs_creature_anatomy_007",
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
      "abstract background"
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
      "observation_id": "obs_objects_001",
      "label": "yellow stars or spark shapes",
      "normalized_label": "yellow stars spark shapes",
      "object_type": "decorative shape",
      "colors": [
        "yellow"
      ],
      "material_appearance": [
        "glowing"
      ],
      "location": "background behind subject",
      "count_reference": "none_visible",
      "confidence": 0.9
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "dark shadows",
      "gold",
      "yellow"
    ],
    "lighting": [
      "glowing highlights on subject"
    ],
    "shadows": [
      "dark shaded inner body"
    ],
    "highlights": [
      "glowing central orb and collar",
      "yellow spikes"
    ],
    "composition": [
      "centered subject",
      "starburst background"
    ],
    "camera_angle": "straight-on",
    "framing": "centered, full body visible",
    "cropping": [],
    "depth": "clear foreground subject with abstract background",
    "motion_cues": [],
    "motifs": [
      "spikes",
      "star shape"
    ],
    "repeated_shapes": [
      "spikes",
      "stars"
    ],
    "style_cues": [
      "glowing",
      "sharp angular forms"
    ],
    "supporting_observation_ids": [
      "obs_creature_anatomy_001",
      "obs_environment_001",
      "obs_objects_001"
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
        "fact_creature_anatomy_007"
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
        "fact_objects_and_props_001"
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
        "obs_environment_001"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_creature_anatomy_005",
        "obs_environment_001",
        "obs_objects_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_creature_anatomy_001",
        "obs_creature_anatomy_003",
        "obs_environment_001",
        "obs_objects_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": []
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_ui_and_print_markers_001",
        "fact_card_ui_and_print_markers_002",
        "fact_card_ui_and_print_markers_003",
        "fact_card_ui_and_print_markers_004",
        "fact_card_ui_and_print_markers_005",
        "fact_card_ui_and_print_markers_006",
        "fact_card_ui_and_print_markers_007",
        "fact_card_ui_and_print_markers_008"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_text_001"
      ],
      "hp_text_observation_ids": [
        "obs_card_ui_text_002"
      ],
      "collector_number_observation_ids": [
        "obs_card_ui_text_004"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_text_005"
      ],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [
        "obs_card_ui_text_007"
      ],
      "bottom_line_text_observation_ids": [],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [
        "obs_card_ui_symbol_001"
      ],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_card_ui_text_006"
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
        "yellow glowing body",
        "floating upright pose",
        "dark background",
        "golden motif",
        "yellow stars"
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
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "semfact_002",
      "category": "state",
      "label": "floating",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_creature_anatomy_005"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [],
        "eyebrows": [],
        "facial_features": [],
        "body_language": [],
        "body_position": [
          "floating upright pose"
        ],
        "motion_state": [
          "floating"
        ],
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
      "term": "yellow glowing body",
      "supporting_observation_ids": [
        "obs_creature_anatomy_003"
      ]
    },
    {
      "term": "floating upright pose",
      "supporting_observation_ids": [
        "obs_creature_anatomy_005"
      ]
    },
    {
      "term": "dark background",
      "supporting_observation_ids": [
        "obs_environment_001"
      ]
    },
    {
      "term": "golden motif",
      "supporting_observation_ids": [
        "obs_environment_001"
      ]
    },
    {
      "term": "yellow stars",
      "supporting_observation_ids": [
        "obs_objects_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "centered composition",
        "source_observation_ids": [
          "obs_creature_anatomy_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "circular motif",
        "source_observation_ids": [
          "obs_creature_anatomy_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "downward orientation",
        "source_observation_ids": [
          "obs_creature_anatomy_007"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.8
      },
      {
        "concept": "floating",
        "source_observation_ids": [
          "obs_creature_anatomy_005",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "glowing highlights",
        "source_observation_ids": [
          "obs_creature_anatomy_001",
          "obs_creature_anatomy_003",
          "obs_creature_anatomy_006"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "spark",
        "source_observation_ids": [
          "obs_objects_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.9
      },
      {
        "concept": "upright orientation",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-101 - Mega Excadrill ex

- Branch: `pokemon`
- Review status: `pending`
- Description confidence: `0.99`
- Attribute confidence: `0.95`
- Cost USD: `0.0130424`
- Artwork observations: `19`
- Card UI / print-marker observations: `6`
- Card UI module evidence references: `8`
- Derived digest: Fact digest. Scene subjects: Mega Excadrill. Semantic facts: fiery background.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Excadrill | mega excadrill | scene_subject | foreground | primary | 0.99 |
| head | head | creature_anatomy | foreground | primary | 0.99 |
| claw | claw | creature_anatomy | foreground | primary | 0.99 |
| arm | arm | creature_anatomy | foreground | primary | 0.95 |
| arm_tip_spikes | arm tip spikes | creature_anatomy | foreground | primary | 0.98 |
| tunnel_drill_nose | tunnel drill nose | creature_anatomy | foreground | primary | 0.95 |
| torso | torso | creature_anatomy | foreground | primary | 0.99 |
| metallic black and gray coloration | coloration black gray metallic | creature_anatomy | foreground | primary | 0.99 |
| red accents on back spikes | color red accents back spikes | creature_anatomy | foreground | primary | 0.97 |
| white face and chest | color white face chest | creature_anatomy | foreground | primary | 0.98 |
| upright orientation | upright orientation | creature_anatomy | foreground | primary | 0.95 |
| forward facing pose with slight angle | forward facing pose angled | creature_anatomy | foreground | primary | 0.95 |
| drill arm raised | limb drill arm raised | creature_anatomy | foreground | primary | 0.96 |
| attack stance | attack stance | creature_anatomy | foreground | primary | 0.94 |
| fiery background with flames | background fiery flames | environment | background | secondary | 0.92 |
| dark shadows | background dark shadows | environment | background | secondary | 0.89 |
| central subject offset to right | composition central offset right | composition | foreground | primary | 0.95 |
| high contrast with dark and bright reds | color contrast dark bright red | color_and_light | foreground | secondary | 0.94 |
| bright yellows in background flames | color bright yellow background flames | color_and_light | background | secondary | 0.92 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name in Japanese including Mega Excadrill ex | card_ui_text | top_center | visible | 0.99 |
| HP 340 | card_ui_text | top_right | visible | 0.99 |
| attack text in Japanese with damage values 90 and 200+ | card_ui_text | mid_lower | visible | 0.96 |
| illustrator text: Illus. Keisuke Azuma | card_ui_text | bottom_left | visible | 0.95 |
| set symbol and card number: 101/081 SR | card_ui_text | bottom_center | visible | 0.95 |
| fighting energy type symbol at top right | card_ui_symbol | top_right | visible | 0.96 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | subjects | visible subject identity | obs_subject_001 | 0.99 |
| fact_002 | creature_anatomy | body region visible | obs_body_region_001 | 0.99 |
| fact_003 | creature_anatomy | body region visible | obs_body_region_002 | 0.99 |
| fact_004 | creature_anatomy | body region visible | obs_body_region_003 | 0.95 |
| fact_005 | creature_anatomy | body region visible | obs_body_region_004 | 0.98 |
| fact_006 | creature_anatomy | body region visible | obs_body_region_005 | 0.95 |
| fact_007 | creature_anatomy | body region visible | obs_body_region_006 | 0.99 |
| fact_008 | creature_anatomy | color metallic black and gray coloration | obs_physical_feature_001 | 0.99 |
| fact_009 | creature_anatomy | color red accents on back spikes | obs_physical_feature_002 | 0.97 |
| fact_010 | creature_anatomy | color white face and chest | obs_physical_feature_003 | 0.98 |
| fact_011 | creature_anatomy | upright orientation | obs_pose_orientation_001 | 0.95 |
| fact_012 | creature_anatomy | forward facing pose with slight angle | obs_pose_orientation_002 | 0.95 |
| fact_013 | creature_anatomy | drill arm raised | obs_action_state_001 | 0.96 |
| fact_014 | creature_anatomy | attack stance | obs_action_state_002 | 0.94 |
| fact_015 | environment | fiery background with flames | obs_environment_001 | 0.92 |
| fact_016 | environment | dark shadows in background | obs_environment_002 | 0.89 |
| fact_017 | composition | central subject offset right | obs_composition_001 | 0.95 |
| fact_018 | color_and_light | high contrast with dark and bright reds | obs_color_light_001 | 0.94 |
| fact_019 | color_and_light | bright yellows in background flames | obs_color_light_002 | 0.92 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_020 | card name text in Japanese including Mega Excadrill ex | obs_card_ui_001 | 0.99 |
| fact_021 | HP 340 text visible | obs_card_ui_002 | 0.99 |
| fact_022 | attack text with damage values 90 and 200+ visible | obs_card_ui_003 | 0.96 |
| fact_023 | illustrator text 'Illus. Keisuke Azuma' visible | obs_card_ui_004 | 0.95 |
| fact_024 | set symbol and card number '101/081 SR' visible | obs_card_ui_005 | 0.95 |
| fact_025 | fighting energy type symbol top right visible | obs_card_ui_006 | 0.96 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_020",
    "fact_021",
    "fact_022",
    "fact_023",
    "fact_024",
    "fact_025"
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
    "obs_card_ui_005"
  ],
  "rarity_mark_observation_ids": [
    "obs_card_ui_005"
  ],
  "copyright_line_observation_ids": [],
  "bottom_line_text_observation_ids": [
    "obs_card_ui_003"
  ],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [
    "obs_card_ui_006"
  ],
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
| creature_anatomy | complete | low | high |  |
| clothing | none_visible | none | not_applicable |  |
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
| fact_grounded_search_terms | complete | none | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| sem_002 | environment | fiery background |  | obs_environment_001 | background fiery flames | 0.92 |

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
| drill arm raised | obs_action_state_001 |
| fiery background | obs_environment_001 |
| metallic black gray coloration | obs_physical_feature_001 |
| red back spikes | obs_physical_feature_002 |
| white face and chest | obs_physical_feature_003 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| centered composition | obs_composition_001 | deterministic_rule | 0.95 |
| fiery background | obs_environment_001 | deterministic_rule | 0.92 |
| flame | obs_color_light_002, obs_environment_001 | deterministic_rule | 0.92 |
| forward facing pose with slight angle | obs_action_state_001, obs_action_state_002, obs_pose_orientation_001, obs_pose_orientation_002, obs_subject_001 | deterministic_rule | 0.99 |
| forward orientation | obs_pose_orientation_002 | deterministic_rule | 0.95 |
| metal-like appearance | obs_physical_feature_001 | deterministic_rule | 0.99 |
| right orientation | obs_composition_001 | deterministic_rule | 0.95 |
| upright orientation | obs_action_state_001, obs_action_state_002, obs_pose_orientation_001, obs_pose_orientation_002, obs_subject_001 | deterministic_rule | 0.99 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Excadrill. Semantic facts: fiery background.
- Quality flags: `none`
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
      "frame_position": "center_right",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_region_001",
      "kind": "creature_anatomy",
      "label": "head",
      "normalized_label": "head",
      "scene_layer": "foreground",
      "frame_position": "center_right",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_region_002",
      "kind": "creature_anatomy",
      "label": "claw",
      "normalized_label": "claw",
      "scene_layer": "foreground",
      "frame_position": "center_right",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_region_003",
      "kind": "creature_anatomy",
      "label": "arm",
      "normalized_label": "arm",
      "scene_layer": "foreground",
      "frame_position": "center_right",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_region_004",
      "kind": "creature_anatomy",
      "label": "arm_tip_spikes",
      "normalized_label": "arm tip spikes",
      "scene_layer": "foreground",
      "frame_position": "center_right",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_region_005",
      "kind": "creature_anatomy",
      "label": "tunnel_drill_nose",
      "normalized_label": "tunnel drill nose",
      "scene_layer": "foreground",
      "frame_position": "center_right",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_region_006",
      "kind": "creature_anatomy",
      "label": "torso",
      "normalized_label": "torso",
      "scene_layer": "foreground",
      "frame_position": "center_right",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_physical_feature_001",
      "kind": "creature_anatomy",
      "label": "metallic black and gray coloration",
      "normalized_label": "coloration black gray metallic",
      "scene_layer": "foreground",
      "frame_position": "center_right",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_physical_feature_002",
      "kind": "creature_anatomy",
      "label": "red accents on back spikes",
      "normalized_label": "color red accents back spikes",
      "scene_layer": "foreground",
      "frame_position": "center_right",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_physical_feature_003",
      "kind": "creature_anatomy",
      "label": "white face and chest",
      "normalized_label": "color white face chest",
      "scene_layer": "foreground",
      "frame_position": "center_right",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_orientation_001",
      "kind": "creature_anatomy",
      "label": "upright orientation",
      "normalized_label": "upright orientation",
      "scene_layer": "foreground",
      "frame_position": "center_right",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_orientation_002",
      "kind": "creature_anatomy",
      "label": "forward facing pose with slight angle",
      "normalized_label": "forward facing pose angled",
      "scene_layer": "foreground",
      "frame_position": "center_right",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_action_state_001",
      "kind": "creature_anatomy",
      "label": "drill arm raised",
      "normalized_label": "limb drill arm raised",
      "scene_layer": "foreground",
      "frame_position": "center_right",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_action_state_002",
      "kind": "creature_anatomy",
      "label": "attack stance",
      "normalized_label": "attack stance",
      "scene_layer": "foreground",
      "frame_position": "center_right",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "fiery background with flames",
      "normalized_label": "background fiery flames",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "secondary",
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_002",
      "kind": "environment",
      "label": "dark shadows",
      "normalized_label": "background dark shadows",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "secondary",
      "confidence": 0.89,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_composition_001",
      "kind": "composition",
      "label": "central subject offset to right",
      "normalized_label": "composition central offset right",
      "scene_layer": "foreground",
      "frame_position": "center_right",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_light_001",
      "kind": "color_and_light",
      "label": "high contrast with dark and bright reds",
      "normalized_label": "color contrast dark bright red",
      "scene_layer": "foreground",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "secondary",
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_light_002",
      "kind": "color_and_light",
      "label": "bright yellows in background flames",
      "normalized_label": "color bright yellow background flames",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "secondary",
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_001",
      "kind": "card_ui_text",
      "label": "card name in Japanese including Mega Excadrill ex",
      "normalized_label": "card name mega excadrill ex",
      "scene_layer": "card_ui",
      "frame_position": "top_center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_002",
      "kind": "card_ui_text",
      "label": "HP 340",
      "normalized_label": "hp 340",
      "scene_layer": "card_ui",
      "frame_position": "top_right",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_003",
      "kind": "card_ui_text",
      "label": "attack text in Japanese with damage values 90 and 200+",
      "normalized_label": "attack text damage 90 200+",
      "scene_layer": "card_ui",
      "frame_position": "mid_lower",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_004",
      "kind": "card_ui_text",
      "label": "illustrator text: Illus. Keisuke Azuma",
      "normalized_label": "illustrator keisuke azuma",
      "scene_layer": "card_ui",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "secondary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_005",
      "kind": "card_ui_text",
      "label": "set symbol and card number: 101/081 SR",
      "normalized_label": "set symbol 101/081 SR",
      "scene_layer": "card_ui",
      "frame_position": "bottom_center",
      "visibility": "visible",
      "salience": "secondary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_006",
      "kind": "card_ui_symbol",
      "label": "fighting energy type symbol at top right",
      "normalized_label": "energy type fighting",
      "scene_layer": "card_ui",
      "frame_position": "top_right",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.96,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_001",
      "module": "subjects",
      "field_path": "[0]",
      "claim": "visible subject identity",
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
      "claim": "body region visible",
      "value": "head",
      "supporting_observation_ids": [
        "obs_body_region_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_003",
      "module": "creature_anatomy",
      "field_path": "body_regions.claw",
      "claim": "body region visible",
      "value": "claw",
      "supporting_observation_ids": [
        "obs_body_region_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "creature_anatomy",
      "field_path": "body_regions.arm",
      "claim": "body region visible",
      "value": "arm",
      "supporting_observation_ids": [
        "obs_body_region_003"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_005",
      "module": "creature_anatomy",
      "field_path": "body_regions.arm_tip_spikes",
      "claim": "body region visible",
      "value": "arm tip spikes",
      "supporting_observation_ids": [
        "obs_body_region_004"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_006",
      "module": "creature_anatomy",
      "field_path": "body_regions.tunnel_drill_nose",
      "claim": "body region visible",
      "value": "tunnel drill nose",
      "supporting_observation_ids": [
        "obs_body_region_005"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_007",
      "module": "creature_anatomy",
      "field_path": "body_regions.torso",
      "claim": "body region visible",
      "value": "torso",
      "supporting_observation_ids": [
        "obs_body_region_006"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_008",
      "module": "creature_anatomy",
      "field_path": "physical_features.color",
      "claim": "color metallic black and gray coloration",
      "value": "black gray metallic",
      "supporting_observation_ids": [
        "obs_physical_feature_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_009",
      "module": "creature_anatomy",
      "field_path": "physical_features.color",
      "claim": "color red accents on back spikes",
      "value": "red accents",
      "supporting_observation_ids": [
        "obs_physical_feature_002"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_010",
      "module": "creature_anatomy",
      "field_path": "physical_features.color",
      "claim": "color white face and chest",
      "value": "white",
      "supporting_observation_ids": [
        "obs_physical_feature_003"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_011",
      "module": "creature_anatomy",
      "field_path": "pose_orientation.orientation",
      "claim": "upright orientation",
      "value": "upright",
      "supporting_observation_ids": [
        "obs_pose_orientation_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_012",
      "module": "creature_anatomy",
      "field_path": "pose_orientation.pose",
      "claim": "forward facing pose with slight angle",
      "value": "forward facing angled",
      "supporting_observation_ids": [
        "obs_pose_orientation_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_013",
      "module": "creature_anatomy",
      "field_path": "action_state",
      "claim": "drill arm raised",
      "value": "drill arm raised",
      "supporting_observation_ids": [
        "obs_action_state_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_014",
      "module": "creature_anatomy",
      "field_path": "action_state",
      "claim": "attack stance",
      "value": "attack stance",
      "supporting_observation_ids": [
        "obs_action_state_002"
      ],
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_015",
      "module": "environment",
      "field_path": "setting",
      "claim": "fiery background with flames",
      "value": "fiery background flames",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_016",
      "module": "environment",
      "field_path": "setting",
      "claim": "dark shadows in background",
      "value": "dark background shadows",
      "supporting_observation_ids": [
        "obs_environment_002"
      ],
      "confidence": 0.89,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_017",
      "module": "composition",
      "field_path": "composition",
      "claim": "central subject offset right",
      "value": "center right offset",
      "supporting_observation_ids": [
        "obs_composition_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_018",
      "module": "color_and_light",
      "field_path": "palette",
      "claim": "high contrast with dark and bright reds",
      "value": "contrast dark bright red",
      "supporting_observation_ids": [
        "obs_color_light_001"
      ],
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_019",
      "module": "color_and_light",
      "field_path": "palette",
      "claim": "bright yellows in background flames",
      "value": "bright yellow background flames",
      "supporting_observation_ids": [
        "obs_color_light_002"
      ],
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_020",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text_observation_ids",
      "claim": "card name text in Japanese including Mega Excadrill ex",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_card_ui_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_021",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text_observation_ids",
      "claim": "HP 340 text visible",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_card_ui_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_022",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text_observation_ids",
      "claim": "attack text with damage values 90 and 200+ visible",
      "value": "visible attack damage text",
      "supporting_observation_ids": [
        "obs_card_ui_003"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_023",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text_observation_ids",
      "claim": "illustrator text 'Illus. Keisuke Azuma' visible",
      "value": "visible illustrator text",
      "supporting_observation_ids": [
        "obs_card_ui_004"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_024",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number_observation_ids",
      "claim": "set symbol and card number '101/081 SR' visible",
      "value": "visible set symbol and number",
      "supporting_observation_ids": [
        "obs_card_ui_005"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_025",
      "module": "card_ui_and_print_markers",
      "field_path": "energy_symbol_observation_ids",
      "claim": "fighting energy type symbol top right visible",
      "value": "visible fighting energy symbol",
      "supporting_observation_ids": [
        "obs_card_ui_006"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "Mega Excadrill",
      "identity_confidence": 0.99,
      "anatomy": [
        "arm",
        "arm tip spikes",
        "claw",
        "head",
        "torso",
        "tunnel drill nose"
      ],
      "physical_features": [
        "metallic black and gray coloration",
        "red accents on back spikes",
        "white face and chest"
      ],
      "pose": [
        "forward facing pose with slight angle"
      ],
      "orientation": "upright",
      "action_state": [
        "attack stance",
        "drill arm raised"
      ],
      "facial_evidence": {
        "eyes": "visible",
        "mouth": "visible",
        "eyebrows": "not visible",
        "face_position": "front",
        "other_visible_evidence": [
          "sharp eyes"
        ]
      },
      "clothing_or_accessories": [],
      "colors": [
        "black",
        "gray",
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
      "obs_action_state_001",
      "obs_action_state_002",
      "obs_body_region_001",
      "obs_body_region_002",
      "obs_body_region_003",
      "obs_body_region_004",
      "obs_body_region_005",
      "obs_body_region_006",
      "obs_composition_001",
      "obs_physical_feature_001",
      "obs_physical_feature_002",
      "obs_physical_feature_003",
      "obs_pose_orientation_001",
      "obs_pose_orientation_002",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_color_light_002",
      "obs_environment_001",
      "obs_environment_002"
    ]
  },
  "environment": {
    "setting": [
      "dark shadows",
      "fiery background with flames"
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
      "bright red",
      "bright yellow",
      "dark gray",
      "red",
      "white"
    ],
    "lighting": [
      "bright highlights on metallic surfaces",
      "high contrast"
    ],
    "shadows": [
      "dark shadows in background"
    ],
    "highlights": [
      "bright yellow flames"
    ],
    "composition": [
      "subject center offset right"
    ],
    "camera_angle": "slightly angled frontal",
    "framing": "tight",
    "cropping": [],
    "depth": "moderate depth with subject foreground and background",
    "motion_cues": [
      "drill arm raised motion implied"
    ],
    "motifs": [],
    "repeated_shapes": [],
    "style_cues": [
      "stylized illustration"
    ],
    "supporting_observation_ids": [
      "obs_action_state_001",
      "obs_color_light_001",
      "obs_color_light_002",
      "obs_composition_001",
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
        "fact_001"
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
        "fact_002",
        "fact_003",
        "fact_004",
        "fact_005",
        "fact_006",
        "fact_007",
        "fact_008",
        "fact_009",
        "fact_010",
        "fact_011",
        "fact_012",
        "fact_013",
        "fact_014"
      ],
      "body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "feature": "head",
          "visibility": "visible",
          "colors": [],
          "details": [
            "sharp eyes"
          ],
          "supporting_observation_ids": [
            "obs_body_region_001"
          ],
          "confidence": 0.99
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "claw",
          "feature": "claw",
          "visibility": "visible",
          "colors": [],
          "details": [],
          "supporting_observation_ids": [
            "obs_body_region_002"
          ],
          "confidence": 0.99
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "arm",
          "feature": "arm",
          "visibility": "visible",
          "colors": [],
          "details": [],
          "supporting_observation_ids": [
            "obs_body_region_003"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "arm",
          "feature": "arm tip spikes",
          "visibility": "visible",
          "colors": [
            "red"
          ],
          "details": [
            "spiked"
          ],
          "supporting_observation_ids": [
            "obs_body_region_004"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "nose",
          "feature": "tunnel drill nose",
          "visibility": "visible",
          "colors": [],
          "details": [],
          "supporting_observation_ids": [
            "obs_body_region_005"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "torso",
          "feature": "torso",
          "visibility": "visible",
          "colors": [],
          "details": [],
          "supporting_observation_ids": [
            "obs_body_region_006"
          ],
          "confidence": 0.99
        }
      ],
      "physical_features": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "entire body",
          "feature": "color",
          "visibility": "visible",
          "colors": [
            "black",
            "gray"
          ],
          "details": [
            "metallic appearance"
          ],
          "supporting_observation_ids": [
            "obs_physical_feature_001"
          ],
          "confidence": 0.99
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "back spikes",
          "feature": "color",
          "visibility": "visible",
          "colors": [
            "red"
          ],
          "details": [
            "red accents"
          ],
          "supporting_observation_ids": [
            "obs_physical_feature_002"
          ],
          "confidence": 0.97
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "face and chest",
          "feature": "color",
          "visibility": "visible",
          "colors": [
            "white"
          ],
          "details": [],
          "supporting_observation_ids": [
            "obs_physical_feature_003"
          ],
          "confidence": 0.98
        }
      ],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "forward facing pose with slight angle"
          ],
          "orientation": "upright",
          "action_state": [
            "attack stance",
            "drill arm raised"
          ],
          "supporting_observation_ids": [
            "obs_action_state_001",
            "obs_action_state_002",
            "obs_pose_orientation_001",
            "obs_pose_orientation_002"
          ],
          "confidence": 0.94
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
        "fact_015",
        "fact_016"
      ],
      "observation_ids": [
        "obs_environment_001",
        "obs_environment_002"
      ]
    },
    "composition": {
      "fact_ids": [
        "fact_017"
      ],
      "observation_ids": [
        "obs_composition_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [
        "fact_018",
        "fact_019"
      ],
      "observation_ids": [
        "obs_color_light_001",
        "obs_color_light_002"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": []
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_020",
        "fact_021",
        "fact_022",
        "fact_023",
        "fact_024",
        "fact_025"
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
        "obs_card_ui_005"
      ],
      "rarity_mark_observation_ids": [
        "obs_card_ui_005"
      ],
      "copyright_line_observation_ids": [],
      "bottom_line_text_observation_ids": [
        "obs_card_ui_003"
      ],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [
        "obs_card_ui_006"
      ],
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
        "drill arm raised",
        "fiery background",
        "metallic black gray coloration",
        "red back spikes",
        "white face and chest"
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
      "review_status": "complete",
      "omission_risk": "none",
      "evidence_quality": "high",
      "abstentions": []
    }
  ],
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "sem_002",
      "category": "environment",
      "label": "fiery background",
      "subject_observation_id": "",
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
          "background fiery flames"
        ],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.92,
      "uncertainty": "none"
    }
  ],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "drill arm raised",
      "supporting_observation_ids": [
        "obs_action_state_001"
      ]
    },
    {
      "term": "fiery background",
      "supporting_observation_ids": [
        "obs_environment_001"
      ]
    },
    {
      "term": "metallic black gray coloration",
      "supporting_observation_ids": [
        "obs_physical_feature_001"
      ]
    },
    {
      "term": "red back spikes",
      "supporting_observation_ids": [
        "obs_physical_feature_002"
      ]
    },
    {
      "term": "white face and chest",
      "supporting_observation_ids": [
        "obs_physical_feature_003"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "centered composition",
        "source_observation_ids": [
          "obs_composition_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "fiery background",
        "source_observation_ids": [
          "obs_environment_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "flame",
        "source_observation_ids": [
          "obs_color_light_002",
          "obs_environment_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "forward facing pose with slight angle",
        "source_observation_ids": [
          "obs_action_state_001",
          "obs_action_state_002",
          "obs_pose_orientation_001",
          "obs_pose_orientation_002",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "forward orientation",
        "source_observation_ids": [
          "obs_pose_orientation_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "metal-like appearance",
        "source_observation_ids": [
          "obs_physical_feature_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "right orientation",
        "source_observation_ids": [
          "obs_composition_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "upright orientation",
        "source_observation_ids": [
          "obs_action_state_001",
          "obs_action_state_002",
          "obs_pose_orientation_001",
          "obs_pose_orientation_002",
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
- Attribute confidence: `0.9`
- Cost USD: `0.0098088`
- Artwork observations: `7`
- Card UI / print-marker observations: `7`
- Card UI module evidence references: `7`
- Derived digest: Fact digest. Scene subjects: Mega Darkrai. Visible observations: mega darkrai, dark creature body, purple glowing eye, branch like dark limbs, green glowing patches, dark forest background, dark color palette green purple highlights. Semantic facts: floating, dark forest.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Darkrai | mega darkrai | scene_subject | foreground | high | 0.99 |
| dark creature body | dark creature body | object | foreground | high | 0.98 |
| purple glowing eye | purple glowing eye | object | foreground | high | 0.97 |
| branch-like dark limbs | branch like dark limbs | object | foreground | high | 0.96 |
| green glowing patches | green glowing patches | object | foreground | medium | 0.9 |
| dark forest background | dark forest background | environment | background | medium | 0.93 |
| dark color palette with green and purple highlights | dark color palette green purple highlights | visual_design | foreground | high | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| メガダークライ ex | card_name_text | top | visible | 0.98 |
| 280 HP | hp_text | top_right | visible | 0.99 |
| dark energy symbol | energy_symbol | top_right | visible | 0.97 |
| set symbol lower left | set_symbol | bottom_left | visible | 0.85 |
| 114/081 SAR | collector_number | bottom_left | visible | 0.99 |
| Illus. AKIRA EGAWA | illustrator_text | bottom_left | visible | 0.95 |
| メガシンカexルール | card_ui_text | bottom_center | visible | 0.92 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | scene subject | obs_subject_001 | 0.99 |
| fact_creature_body_001 | creature_anatomy | body dark and shadowy with branching limbs | obs_creature_body_001, obs_creature_limbs_001 | 0.98 |
| fact_creature_eye_001 | creature_anatomy | single central purple glowing eye | obs_creature_eye_001 | 0.97 |
| fact_creature_limbs_001 | creature_anatomy | branch-like dark limbs | obs_creature_limbs_001 | 0.96 |
| fact_creature_markings_001 | creature_anatomy | green glowing patches on body | obs_creature_markings_001 | 0.9 |
| fact_environment_001 | environment | dark forest background | obs_environment_001 | 0.93 |
| fact_visual_design_palette_001 | color_and_light | dark color palette with green and purple highlights | obs_visual_design_001 | 0.95 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_name_text_001 | card name text | obs_card_ui_name_text_001 | 0.98 |
| fact_card_ui_hp_text_001 | HP text visible | obs_card_ui_hp_text_001 | 0.99 |
| fact_card_ui_energy_symbol_001 | dark energy symbol | obs_card_ui_energy_symbol_001 | 0.97 |
| fact_card_ui_set_symbol_001 | set symbol present | obs_card_ui_set_symbol_001 | 0.85 |
| fact_card_ui_collector_number_001 | collector number visible | obs_card_ui_collector_number_001 | 0.99 |
| fact_card_ui_illustrator_text_001 | illustrator text present | obs_card_ui_illustrator_text_001 | 0.95 |
| fact_card_ui_type_text_001 | bottom text present | obs_card_ui_type_text_001 | 0.92 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_collector_number_001",
    "fact_card_ui_energy_symbol_001",
    "fact_card_ui_hp_text_001",
    "fact_card_ui_illustrator_text_001",
    "fact_card_ui_name_text_001",
    "fact_card_ui_set_symbol_001",
    "fact_card_ui_type_text_001"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_name_text_001"
  ],
  "hp_text_observation_ids": [
    "obs_card_ui_hp_text_001"
  ],
  "collector_number_observation_ids": [
    "obs_card_ui_collector_number_001"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_set_symbol_001"
  ],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [],
  "bottom_line_text_observation_ids": [
    "obs_card_ui_type_text_001"
  ],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [
    "obs_card_ui_energy_symbol_001"
  ],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_card_ui_illustrator_text_001"
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
| environment | complete | low | high |  |
| composition | likely_complete | low | medium |  |
| color_and_light | complete | low | high |  |
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
| semfact_001 | state | floating | obs_subject_001 | obs_subject_001 | purple glowing eye purple eye glow floating upright stationary | 0.95 |
| semfact_002 | environment | dark forest |  | obs_environment_001 | dark forest | 0.93 |

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
| floating dark creature | obs_creature_body_001, obs_subject_001 |
| purple glowing eye | obs_creature_eye_001 |
| green glowing markings | obs_creature_markings_001 |
| dark forest background | obs_environment_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| dark forest | obs_environment_001 | deterministic_rule | 0.93 |
| diagonal orientation | obs_subject_001 | deterministic_rule | 0.99 |
| floating | obs_subject_001 | deterministic_rule | 0.99 |
| forest | obs_environment_001 | deterministic_rule | 0.93 |
| glowing highlights | obs_creature_eye_001, obs_creature_markings_001 | deterministic_rule | 0.97 |
| upright orientation | obs_subject_001 | deterministic_rule | 0.99 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Darkrai. Visible observations: mega darkrai, dark creature body, purple glowing eye, branch like dark limbs, green glowing patches, dark forest background, dark color palette green purple highlights. Semantic facts: floating, dark forest.
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
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_body_001",
      "kind": "object",
      "label": "dark creature body",
      "normalized_label": "dark creature body",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_eye_001",
      "kind": "object",
      "label": "purple glowing eye",
      "normalized_label": "purple glowing eye",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_limbs_001",
      "kind": "object",
      "label": "branch-like dark limbs",
      "normalized_label": "branch like dark limbs",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_markings_001",
      "kind": "object",
      "label": "green glowing patches",
      "normalized_label": "green glowing patches",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "dark forest background",
      "normalized_label": "dark forest background",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.93,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_visual_design_001",
      "kind": "visual_design",
      "label": "dark color palette with green and purple highlights",
      "normalized_label": "dark color palette green purple highlights",
      "scene_layer": "foreground",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_text_001",
      "kind": "card_name_text",
      "label": "メガダークライ ex",
      "normalized_label": "mega darkrai ex",
      "scene_layer": "card_ui",
      "frame_position": "top",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_hp_text_001",
      "kind": "hp_text",
      "label": "280 HP",
      "normalized_label": "280 hp",
      "scene_layer": "card_ui",
      "frame_position": "top_right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_energy_symbol_001",
      "kind": "energy_symbol",
      "label": "dark energy symbol",
      "normalized_label": "dark energy symbol",
      "scene_layer": "card_ui",
      "frame_position": "top_right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_symbol_001",
      "kind": "set_symbol",
      "label": "set symbol lower left",
      "normalized_label": "set symbol",
      "scene_layer": "card_ui",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.85,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_card_ui_collector_number_001",
      "kind": "collector_number",
      "label": "114/081 SAR",
      "normalized_label": "114/81 sar",
      "scene_layer": "card_ui",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_illustrator_text_001",
      "kind": "illustrator_text",
      "label": "Illus. AKIRA EGAWA",
      "normalized_label": "illustrator akira egawa",
      "scene_layer": "card_ui",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_type_text_001",
      "kind": "card_ui_text",
      "label": "メガシンカexルール",
      "normalized_label": "megashinka ex rule",
      "scene_layer": "card_ui",
      "frame_position": "bottom_center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.92,
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
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_body_001",
      "module": "creature_anatomy",
      "field_path": "body_regions.body",
      "claim": "body dark and shadowy with branching limbs",
      "value": "dark, shadowy, branch-like limbs",
      "supporting_observation_ids": [
        "obs_creature_body_001",
        "obs_creature_limbs_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_eye_001",
      "module": "creature_anatomy",
      "field_path": "physical_features.eye",
      "claim": "single central purple glowing eye",
      "value": "purple glowing eye",
      "supporting_observation_ids": [
        "obs_creature_eye_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_limbs_001",
      "module": "creature_anatomy",
      "field_path": "body_regions.limbs",
      "claim": "branch-like dark limbs",
      "value": "branch-like limbs",
      "supporting_observation_ids": [
        "obs_creature_limbs_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_markings_001",
      "module": "creature_anatomy",
      "field_path": "physical_features.markings",
      "claim": "green glowing patches on body",
      "value": "green glowing patches",
      "supporting_observation_ids": [
        "obs_creature_markings_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "setting",
      "claim": "dark forest background",
      "value": "dark forest",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.93,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_visual_design_palette_001",
      "module": "color_and_light",
      "field_path": "palette",
      "claim": "dark color palette with green and purple highlights",
      "value": "dark, green, purple",
      "supporting_observation_ids": [
        "obs_visual_design_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_name_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text",
      "value": "メガダークライ ex",
      "supporting_observation_ids": [
        "obs_card_ui_name_text_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_hp_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text",
      "claim": "HP text visible",
      "value": "280",
      "supporting_observation_ids": [
        "obs_card_ui_hp_text_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_energy_symbol_001",
      "module": "card_ui_and_print_markers",
      "field_path": "energy_symbol",
      "claim": "dark energy symbol",
      "value": "dark",
      "supporting_observation_ids": [
        "obs_card_ui_energy_symbol_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_set_symbol_001",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "set symbol present",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_card_ui_set_symbol_001"
      ],
      "confidence": 0.85,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_card_ui_collector_number_001",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "collector number visible",
      "value": "114/081 SAR",
      "supporting_observation_ids": [
        "obs_card_ui_collector_number_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_illustrator_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator text present",
      "value": "Illus. AKIRA EGAWA",
      "supporting_observation_ids": [
        "obs_card_ui_illustrator_text_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_type_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text",
      "claim": "bottom text present",
      "value": "メガシンカexルール",
      "supporting_observation_ids": [
        "obs_card_ui_type_text_001"
      ],
      "confidence": 0.92,
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
        "branch-like limbs",
        "dark body",
        "green glowing patches",
        "purple glowing eye"
      ],
      "physical_features": [
        "green patches",
        "purple eye glow"
      ],
      "pose": [
        "diagonal orientation",
        "floating"
      ],
      "orientation": "upright",
      "action_state": [
        "floating",
        "stationary"
      ],
      "facial_evidence": {
        "eyes": "purple glowing",
        "mouth": "not visible",
        "eyebrows": "not visible",
        "face_position": "centered",
        "other_visible_evidence": [
          "glowing eye"
        ]
      },
      "clothing_or_accessories": [],
      "colors": [
        "dark",
        "green",
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
      "obs_creature_body_001",
      "obs_creature_eye_001",
      "obs_creature_limbs_001",
      "obs_creature_markings_001",
      "obs_subject_001",
      "obs_visual_design_001"
    ],
    "midground": [],
    "background": [
      "obs_environment_001"
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
      "dark",
      "green",
      "purple"
    ],
    "lighting": [
      "dim",
      "glowing eyes"
    ],
    "shadows": [
      "high contrast"
    ],
    "highlights": [
      "green patches glow",
      "purple eye glow"
    ],
    "composition": [
      "central subject"
    ],
    "camera_angle": "front",
    "framing": "tight",
    "cropping": [
      "none"
    ],
    "depth": "moderate",
    "motion_cues": [
      "floating"
    ],
    "motifs": [
      "dark branching limbs"
    ],
    "repeated_shapes": [
      "branch motifs"
    ],
    "style_cues": [
      "dark",
      "glowing effects"
    ],
    "supporting_observation_ids": [
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
        "fact_creature_body_001",
        "fact_creature_eye_001",
        "fact_creature_limbs_001",
        "fact_creature_markings_001"
      ],
      "body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "body",
          "feature": "dark shadowy body with branch-like limbs",
          "visibility": "visible",
          "colors": [
            "dark"
          ],
          "details": [
            "branch-like limbs"
          ],
          "supporting_observation_ids": [
            "obs_creature_body_001",
            "obs_creature_limbs_001"
          ],
          "confidence": 0.96
        }
      ],
      "physical_features": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "face",
          "feature": "purple glowing eye",
          "visibility": "visible",
          "colors": [
            "purple"
          ],
          "details": [
            "glowing"
          ],
          "supporting_observation_ids": [
            "obs_creature_eye_001"
          ],
          "confidence": 0.97
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "body",
          "feature": "green glowing markings",
          "visibility": "visible",
          "colors": [
            "green"
          ],
          "details": [
            "glowing patches"
          ],
          "supporting_observation_ids": [
            "obs_creature_markings_001"
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
          "action_state": [
            "stationary"
          ],
          "supporting_observation_ids": [
            "obs_subject_001"
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
      "object_observation_ids": []
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
      "observation_ids": [
        "obs_visual_design_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [
        "fact_visual_design_palette_001"
      ],
      "observation_ids": [
        "obs_visual_design_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": []
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_ui_collector_number_001",
        "fact_card_ui_energy_symbol_001",
        "fact_card_ui_hp_text_001",
        "fact_card_ui_illustrator_text_001",
        "fact_card_ui_name_text_001",
        "fact_card_ui_set_symbol_001",
        "fact_card_ui_type_text_001"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_name_text_001"
      ],
      "hp_text_observation_ids": [
        "obs_card_ui_hp_text_001"
      ],
      "collector_number_observation_ids": [
        "obs_card_ui_collector_number_001"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_set_symbol_001"
      ],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [],
      "bottom_line_text_observation_ids": [
        "obs_card_ui_type_text_001"
      ],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [
        "obs_card_ui_energy_symbol_001"
      ],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_card_ui_illustrator_text_001"
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
        "floating dark creature",
        "purple glowing eye",
        "green glowing markings",
        "dark forest background"
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
      "review_status": "complete",
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
      "review_status": "likely_complete",
      "omission_risk": "low",
      "evidence_quality": "high",
      "abstentions": []
    }
  ],
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "semfact_001",
      "category": "state",
      "label": "floating",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [
          "purple glowing eye"
        ],
        "eyebrows": [],
        "facial_features": [
          "purple eye glow"
        ],
        "body_language": [],
        "body_position": [
          "floating",
          "upright"
        ],
        "motion_state": [
          "stationary"
        ],
        "environment": [],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.95,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "semfact_002",
      "category": "environment",
      "label": "dark forest",
      "subject_observation_id": "",
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
          "dark forest"
        ],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.93,
      "uncertainty": "none"
    }
  ],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "floating dark creature",
      "supporting_observation_ids": [
        "obs_creature_body_001",
        "obs_subject_001"
      ]
    },
    {
      "term": "purple glowing eye",
      "supporting_observation_ids": [
        "obs_creature_eye_001"
      ]
    },
    {
      "term": "green glowing markings",
      "supporting_observation_ids": [
        "obs_creature_markings_001"
      ]
    },
    {
      "term": "dark forest background",
      "supporting_observation_ids": [
        "obs_environment_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "dark forest",
        "source_observation_ids": [
          "obs_environment_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.93
      },
      {
        "concept": "diagonal orientation",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "floating",
        "source_observation_ids": [
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
        "confidence": 0.93
      },
      {
        "concept": "glowing highlights",
        "source_observation_ids": [
          "obs_creature_eye_001",
          "obs_creature_markings_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
      },
      {
        "concept": "upright orientation",
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
- Description confidence: `0.95`
- Attribute confidence: `0.94`
- Cost USD: `0.0108924`
- Artwork observations: `10`
- Card UI / print-marker observations: `7`
- Card UI module evidence references: `7`
- Derived digest: Fact digest. Scene subjects: Mega Darkrai. Semantic facts: floating.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Darkrai Pokemon | darkrai | scene_subject | foreground | primary | 1 |
| dark gray-black body | dark gray-black body | creature_anatomy | foreground | primary | 1 |
| white head helmet or hair covering | white head helmet | creature_anatomy | foreground | primary | 0.95 |
| single visible pink eye | pink eye | creature_anatomy | foreground | primary | 0.9 |
| spiky jagged collar around neck | spiky collar | creature_anatomy | foreground | primary | 0.9 |
| four wispy black tentacle-like arms | four tentacle arms | creature_anatomy | foreground | primary | 1 |
| floating pose with limbs extended and twisted | floating pose | creature_anatomy | foreground | primary | 0.85 |
| green and yellow abstract background with lightning-like cracks | green yellow abstract background | environment | background | secondary | 0.9 |
| color palette mostly dark gray, white, bright green, yellow | dark gray white green yellow palette | color_and_light | foreground and background | primary | 0.9 |
| bright highlights on white head and green background | bright highlights | color_and_light | foreground and background | secondary | 0.8 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text 'メガダークライex' in yellow top left | card_name_text | top left | visible | 1 |
| HP 280 top right | hp_text | top right | visible | 1 |
| dark type symbol top right | card_ui_symbol | top right | visible | 1 |
| attack text area center bottom in Japanese | card_ui_text | bottom center | visible | 0.95 |
| collector number 099/081 SR bottom left | collector_number | bottom left | visible | 1 |
| illustrator text 'Illus. 5ban Graphics' bottom left | illustrator_text | bottom left | visible | 1 |
| set symbol J M5 bottom left | set_symbol | bottom left | visible | 1 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | subject identity | obs_subject_001 | 1 |
| fact_anatomy_body_001 | creature_anatomy | body color | obs_anatomy_body_001 | 1 |
| fact_anatomy_head_001 | creature_anatomy | head covering color | obs_anatomy_head_001 | 0.95 |
| fact_anatomy_eye_001 | creature_anatomy | eye color | obs_anatomy_eye_001 | 0.9 |
| fact_anatomy_collar_001 | creature_anatomy | neck collar | obs_physical_feature_shadow_001 | 0.9 |
| fact_anatomy_appendages_001 | creature_anatomy | limbs | obs_body_appendages_001 | 1 |
| fact_anatomy_pose_001 | creature_anatomy | pose | obs_pose_001 | 0.85 |
| fact_environment_background_001 | environment | background type | obs_background_001 | 0.9 |
| fact_color_palette_001 | color_and_light | color palette | obs_color_palette_001 | 0.9 |
| fact_lighting_001 | color_and_light | lighting effects | obs_lighting_001 | 0.8 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_name_001 | card name text | obs_card_ui_name_001 | 1 |
| fact_card_ui_hp_001 | hp text | obs_card_ui_hp_001 | 1 |
| fact_card_ui_type_001 | energy type symbol | obs_card_ui_type_001 | 1 |
| fact_card_ui_attack_001 | attack text | obs_card_ui_attack_001 | 0.95 |
| fact_card_ui_collectornum_001 | collector number text | obs_card_ui_collectornum_001 | 1 |
| fact_card_ui_illustrator_001 | illustrator text | obs_card_ui_illustrator_001 | 1 |
| fact_card_ui_set_symbol_001 | set symbol | obs_card_ui_set_symbol_001 | 1 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_attack_001",
    "fact_card_ui_collectornum_001",
    "fact_card_ui_hp_001",
    "fact_card_ui_illustrator_001",
    "fact_card_ui_name_001",
    "fact_card_ui_set_symbol_001",
    "fact_card_ui_type_001"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_name_001"
  ],
  "hp_text_observation_ids": [
    "obs_card_ui_hp_001"
  ],
  "collector_number_observation_ids": [
    "obs_card_ui_collectornum_001"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_set_symbol_001"
  ],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [],
  "bottom_line_text_observation_ids": [
    "obs_card_ui_attack_001"
  ],
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
| objects_and_props | none_visible | none | not_applicable |  |
| environment | complete | none | high |  |
| composition | none_visible | none | not_applicable |  |
| color_and_light | complete | none | high |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | complete | none | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| sem_fact_001 | action | floating | obs_subject_001 | obs_pose_001 | floating pose with limbs extended and twisted floating pose with limbs extended and twisted floating | 0.85 |

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
| dark gray Pokemon body | obs_anatomy_body_001 |
| white helmet head | obs_anatomy_head_001 |
| pink eye | obs_anatomy_eye_001 |
| four limb tentacles | obs_body_appendages_001 |
| green yellow lightning background | obs_background_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| cannot determine orientation | obs_pose_001, obs_subject_001 | deterministic_rule | 1 |
| floating | obs_pose_001, obs_subject_001 | deterministic_rule | 1 |
| glowing highlights | obs_lighting_001 | deterministic_rule | 0.92 |
| lightning | obs_background_001 | deterministic_rule | 0.92 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Darkrai. Semantic facts: floating.
- Quality flags: `potential_weather_field_alignment_missing`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "Mega Darkrai Pokemon",
      "normalized_label": "darkrai",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_anatomy_body_001",
      "kind": "creature_anatomy",
      "label": "dark gray-black body",
      "normalized_label": "dark gray-black body",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_anatomy_head_001",
      "kind": "creature_anatomy",
      "label": "white head helmet or hair covering",
      "normalized_label": "white head helmet",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_anatomy_eye_001",
      "kind": "creature_anatomy",
      "label": "single visible pink eye",
      "normalized_label": "pink eye",
      "scene_layer": "foreground",
      "frame_position": "center right",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_physical_feature_shadow_001",
      "kind": "creature_anatomy",
      "label": "spiky jagged collar around neck",
      "normalized_label": "spiky collar",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_appendages_001",
      "kind": "creature_anatomy",
      "label": "four wispy black tentacle-like arms",
      "normalized_label": "four tentacle arms",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_001",
      "kind": "creature_anatomy",
      "label": "floating pose with limbs extended and twisted",
      "normalized_label": "floating pose",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.85,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_background_001",
      "kind": "environment",
      "label": "green and yellow abstract background with lightning-like cracks",
      "normalized_label": "green yellow abstract background",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "secondary",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_palette_001",
      "kind": "color_and_light",
      "label": "color palette mostly dark gray, white, bright green, yellow",
      "normalized_label": "dark gray white green yellow palette",
      "scene_layer": "foreground and background",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_lighting_001",
      "kind": "color_and_light",
      "label": "bright highlights on white head and green background",
      "normalized_label": "bright highlights",
      "scene_layer": "foreground and background",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "secondary",
      "confidence": 0.8,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_001",
      "kind": "card_name_text",
      "label": "card name text 'メガダークライex' in yellow top left",
      "normalized_label": "card name メガダークライex",
      "scene_layer": "ui",
      "frame_position": "top left",
      "visibility": "visible",
      "salience": "secondary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_hp_001",
      "kind": "hp_text",
      "label": "HP 280 top right",
      "normalized_label": "HP 280",
      "scene_layer": "ui",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "secondary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_type_001",
      "kind": "card_ui_symbol",
      "label": "dark type symbol top right",
      "normalized_label": "dark type symbol",
      "scene_layer": "ui",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "secondary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_attack_001",
      "kind": "card_ui_text",
      "label": "attack text area center bottom in Japanese",
      "normalized_label": "attack text Japanese",
      "scene_layer": "ui",
      "frame_position": "bottom center",
      "visibility": "visible",
      "salience": "secondary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_collectornum_001",
      "kind": "collector_number",
      "label": "collector number 099/081 SR bottom left",
      "normalized_label": "collector number 099/081 SR",
      "scene_layer": "ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "secondary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_illustrator_001",
      "kind": "illustrator_text",
      "label": "illustrator text 'Illus. 5ban Graphics' bottom left",
      "normalized_label": "illustrator 5ban Graphics",
      "scene_layer": "ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "secondary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_symbol_001",
      "kind": "set_symbol",
      "label": "set symbol J M5 bottom left",
      "normalized_label": "set symbol J M5",
      "scene_layer": "ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "secondary",
      "confidence": 1,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_001",
      "module": "subjects",
      "field_path": "subjects[0]",
      "claim": "subject identity",
      "value": "Mega Darkrai",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_anatomy_body_001",
      "module": "creature_anatomy",
      "field_path": "body_regions[0]",
      "claim": "body color",
      "value": "dark gray-black",
      "supporting_observation_ids": [
        "obs_anatomy_body_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_anatomy_head_001",
      "module": "creature_anatomy",
      "field_path": "body_regions[1]",
      "claim": "head covering color",
      "value": "white",
      "supporting_observation_ids": [
        "obs_anatomy_head_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_anatomy_eye_001",
      "module": "creature_anatomy",
      "field_path": "physical_features[0]",
      "claim": "eye color",
      "value": "pink",
      "supporting_observation_ids": [
        "obs_anatomy_eye_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_anatomy_collar_001",
      "module": "creature_anatomy",
      "field_path": "physical_features[1]",
      "claim": "neck collar",
      "value": "spiky jagged collar",
      "supporting_observation_ids": [
        "obs_physical_feature_shadow_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_anatomy_appendages_001",
      "module": "creature_anatomy",
      "field_path": "body_regions[2]",
      "claim": "limbs",
      "value": "four wispy black tentacle arms",
      "supporting_observation_ids": [
        "obs_body_appendages_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_anatomy_pose_001",
      "module": "creature_anatomy",
      "field_path": "pose_orientation[0]",
      "claim": "pose",
      "value": "floating with limbs twisted",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "confidence": 0.85,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_background_001",
      "module": "environment",
      "field_path": "setting[0]",
      "claim": "background type",
      "value": "green and yellow abstract pattern with lightning cracks",
      "supporting_observation_ids": [
        "obs_background_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_color_palette_001",
      "module": "color_and_light",
      "field_path": "palette[0]",
      "claim": "color palette",
      "value": "dark gray, white, bright green, yellow",
      "supporting_observation_ids": [
        "obs_color_palette_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_lighting_001",
      "module": "color_and_light",
      "field_path": "lighting[0]",
      "claim": "lighting effects",
      "value": "bright highlights on white head and green background",
      "supporting_observation_ids": [
        "obs_lighting_001"
      ],
      "confidence": 0.8,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_name_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text_observation_ids[0]",
      "claim": "card name text",
      "value": "メガダークライex",
      "supporting_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_hp_001",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text_observation_ids[0]",
      "claim": "hp text",
      "value": "HP 280",
      "supporting_observation_ids": [
        "obs_card_ui_hp_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_type_001",
      "module": "card_ui_and_print_markers",
      "field_path": "energy_symbol_observation_ids[0]",
      "claim": "energy type symbol",
      "value": "dark",
      "supporting_observation_ids": [
        "obs_card_ui_type_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_attack_001",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text_observation_ids[0]",
      "claim": "attack text",
      "value": "Japanese text attacks",
      "supporting_observation_ids": [
        "obs_card_ui_attack_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_collectornum_001",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number_observation_ids[0]",
      "claim": "collector number text",
      "value": "099/081 SR",
      "supporting_observation_ids": [
        "obs_card_ui_collectornum_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_illustrator_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text_observation_ids[0]",
      "claim": "illustrator text",
      "value": "Illus. 5ban Graphics",
      "supporting_observation_ids": [
        "obs_card_ui_illustrator_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_set_symbol_001",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol_observation_ids[0]",
      "claim": "set symbol",
      "value": "J M5",
      "supporting_observation_ids": [
        "obs_card_ui_set_symbol_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "Mega Darkrai",
      "identity_confidence": 1,
      "anatomy": [
        "dark gray-black body",
        "four wispy black tentacle-like arms",
        "single visible pink eye",
        "spiky jagged collar around neck",
        "white head helmet or hair covering"
      ],
      "physical_features": [
        "pink eye",
        "spiky collar"
      ],
      "pose": [
        "floating"
      ],
      "orientation": "cannot determine",
      "action_state": [],
      "facial_evidence": {
        "eyes": "visible pink eye",
        "mouth": "not visible",
        "eyebrows": "not visible",
        "face_position": "center right",
        "other_visible_evidence": [
          "white head covering"
        ]
      },
      "clothing_or_accessories": [],
      "colors": [
        "black",
        "dark gray",
        "green",
        "pink",
        "white",
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
      "obs_anatomy_body_001",
      "obs_anatomy_eye_001",
      "obs_anatomy_head_001",
      "obs_body_appendages_001",
      "obs_physical_feature_shadow_001",
      "obs_pose_001",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_background_001"
    ]
  },
  "environment": {
    "setting": [
      "green and yellow abstract background with lightning-like cracks"
    ],
    "indoor_outdoor": "cannot_determine",
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
      "bright green",
      "dark gray",
      "white",
      "yellow"
    ],
    "lighting": [
      "bright highlights on white head and green background"
    ],
    "shadows": [],
    "highlights": [
      "bright highlights on white head and green background"
    ],
    "composition": [
      "centered subject floating",
      "diagonal flow of limbs"
    ],
    "camera_angle": "straight on",
    "framing": "centered tight",
    "cropping": [
      "full view of subject"
    ],
    "depth": "moderate depth with subject clear",
    "motion_cues": [
      "floating pose limbs twisted"
    ],
    "motifs": [
      "lightning cracks background"
    ],
    "repeated_shapes": [
      "four tentacle arms"
    ],
    "style_cues": [
      "stylized Pokemon artwork"
    ],
    "supporting_observation_ids": [
      "obs_background_001",
      "obs_color_palette_001",
      "obs_lighting_001",
      "obs_pose_001",
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
        "fact_anatomy_appendages_001",
        "fact_anatomy_body_001",
        "fact_anatomy_collar_001",
        "fact_anatomy_eye_001",
        "fact_anatomy_head_001",
        "fact_anatomy_pose_001"
      ],
      "body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "body",
          "feature": "color",
          "visibility": "visible",
          "colors": [
            "black",
            "dark gray"
          ],
          "details": [
            "dark gray-black body"
          ],
          "supporting_observation_ids": [
            "obs_anatomy_body_001"
          ],
          "confidence": 1
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "feature": "helmet or hair covering",
          "visibility": "visible",
          "colors": [
            "white"
          ],
          "details": [
            "white head helmet or hair covering"
          ],
          "supporting_observation_ids": [
            "obs_anatomy_head_001"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "arms or limbs",
          "feature": "tentacle-like limbs",
          "visibility": "visible",
          "colors": [
            "black"
          ],
          "details": [
            "four wispy black tentacle-like arms"
          ],
          "supporting_observation_ids": [
            "obs_body_appendages_001"
          ],
          "confidence": 1
        }
      ],
      "physical_features": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "eye",
          "feature": "eye color",
          "visibility": "visible",
          "colors": [
            "pink"
          ],
          "details": [
            "single visible pink eye"
          ],
          "supporting_observation_ids": [
            "obs_anatomy_eye_001"
          ],
          "confidence": 0.9
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "neck",
          "feature": "spiky collar",
          "visibility": "visible",
          "colors": [],
          "details": [
            "spiky jagged collar around neck"
          ],
          "supporting_observation_ids": [
            "obs_physical_feature_shadow_001"
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
          "orientation": "cannot determine",
          "action_state": [],
          "supporting_observation_ids": [
            "obs_pose_001"
          ],
          "confidence": 0.85
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
        "fact_environment_background_001"
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
        "fact_color_palette_001",
        "fact_lighting_001"
      ],
      "observation_ids": [
        "obs_color_palette_001",
        "obs_lighting_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": []
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_ui_attack_001",
        "fact_card_ui_collectornum_001",
        "fact_card_ui_hp_001",
        "fact_card_ui_illustrator_001",
        "fact_card_ui_name_001",
        "fact_card_ui_set_symbol_001",
        "fact_card_ui_type_001"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "hp_text_observation_ids": [
        "obs_card_ui_hp_001"
      ],
      "collector_number_observation_ids": [
        "obs_card_ui_collectornum_001"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_set_symbol_001"
      ],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [],
      "bottom_line_text_observation_ids": [
        "obs_card_ui_attack_001"
      ],
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
        "floating",
        "dark gray Pokemon body",
        "white helmet head",
        "pink eye",
        "four limb tentacles",
        "green yellow lightning background"
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
      "review_status": "complete",
      "omission_risk": "none",
      "evidence_quality": "high",
      "abstentions": []
    }
  ],
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "sem_fact_001",
      "category": "action",
      "label": "floating",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [],
        "eyebrows": [],
        "facial_features": [],
        "body_language": [
          "floating pose with limbs extended and twisted"
        ],
        "body_position": [
          "floating pose with limbs extended and twisted"
        ],
        "motion_state": [
          "floating"
        ],
        "environment": [],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.85,
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
      "term": "dark gray Pokemon body",
      "supporting_observation_ids": [
        "obs_anatomy_body_001"
      ]
    },
    {
      "term": "white helmet head",
      "supporting_observation_ids": [
        "obs_anatomy_head_001"
      ]
    },
    {
      "term": "pink eye",
      "supporting_observation_ids": [
        "obs_anatomy_eye_001"
      ]
    },
    {
      "term": "four limb tentacles",
      "supporting_observation_ids": [
        "obs_body_appendages_001"
      ]
    },
    {
      "term": "green yellow lightning background",
      "supporting_observation_ids": [
        "obs_background_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "cannot determine orientation",
        "source_observation_ids": [
          "obs_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "floating",
        "source_observation_ids": [
          "obs_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "glowing highlights",
        "source_observation_ids": [
          "obs_lighting_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "lightning",
        "source_observation_ids": [
          "obs_background_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-097 - Mega Chandelure ex

- Branch: `pokemon`
- Review status: `pending`
- Description confidence: `0.95`
- Attribute confidence: `0.95`
- Cost USD: `0.0110624`
- Artwork observations: `12`
- Card UI / print-marker observations: `7`
- Card UI module evidence references: `6`
- Derived digest: Fact digest. Scene subjects: Mega Chandelure. Visible observations: mega chandeler pokemon, central glass body region, candle arm with flame tip, multiple candle arms with glowing yellow flames, black swirling body parts, purple glowing accents on body, yellow highlights on black arms, floating orientation. Semantic facts: floating, abstract background.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Chandelure Pokemon | mega chandeler pokemon | scene_subject | foreground | high | 0.99 |
| central glass body region | central glass body region | feature | foreground | high | 0.98 |
| candle arm with flame tip | candle arm with flame tip | feature | foreground | high | 0.98 |
| multiple candle arms with glowing yellow flames | multiple candle arms with glowing yellow flames | feature | foreground | high | 0.99 |
| black swirling body parts | black swirling body parts | feature | foreground | high | 0.99 |
| purple glowing accents on body | purple glowing accents on body | feature | foreground | medium | 0.95 |
| yellow highlights on black arms | yellow highlights on black arms | feature | foreground | medium | 0.96 |
| floating orientation | floating orientation | pose_orientation | foreground | high | 0.99 |
| inactive, no limbs moving | inactive no limbs moving | action_state | foreground | medium | 0.9 |
| abstract dark blue and purple background with pink glowing symbol | abstract dark blue purple background pink glowing symbol | environment | background | medium | 0.95 |
| purple, black, yellow, blue and pink colors dominant | purple black yellow blue pink colors dominant | color_palette | foreground background | high | 0.98 |
| glowing flame tips with yellow and orange gradients | glowing flame tips yellow orange gradients | lighting | foreground | high | 0.97 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text in Japanese with 'ex' | card_ui_text | top center | fully_visible | 0.99 |
| HP 350 | hp_text | top right | fully_visible | 0.99 |
| Psychic Energy symbol | card_ui_symbol | top left | fully_visible | 0.99 |
| Stage 2 evolution icon | card_ui_symbol | top left near energy symbol | fully_visible | 0.98 |
| Illus. 5ban Graphics | illustrator_text | bottom left | fully_visible | 0.99 |
| 097/081 SR | collector_number | bottom left | fully_visible | 0.99 |
| Set symbol for Abyss Eye (JPN M5) | set_symbol | bottom left near number | fully_visible | 0.99 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | subject is Mega Chandelure Pokemon | obs_subject_001 | 0.99 |
| fact_creature_anatomy_001 | creature_anatomy | central body is glass lantern shaped | obs_creature_anatomy_001 | 0.98 |
| fact_creature_anatomy_002 | creature_anatomy | multiple candle arms with flame tips present | obs_creature_anatomy_002, obs_creature_anatomy_003 | 0.99 |
| fact_creature_anatomy_003 | creature_anatomy | body colors include black, purple, yellow and orange flames | obs_creature_anatomy_004, obs_creature_anatomy_005, obs_creature_anatomy_006 | 0.97 |
| fact_pose_001 | creature_anatomy | floating orientation | obs_pose_001 | 0.99 |
| fact_environment_001 | environment | abstract dark blue and purple background with pink glowing symbol | obs_background_001 | 0.95 |
| fact_visual_design_001 | color_and_light | dominant palette includes purple, black, yellow, blue, pink | obs_palette_001 | 0.98 |
| fact_visual_design_002 | color_and_light | yellow and orange glowing flame tips | obs_lighting_001 | 0.97 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_and_print_markers_001 | card name text contains Japanese text and 'ex' marker | obs_card_ui_text_001 | 0.99 |
| fact_card_ui_and_print_markers_002 | card HP is 350 | obs_hp_text_001 | 0.99 |
| fact_card_ui_and_print_markers_003 | psychic energy symbol visible | obs_energy_symbol_001 | 0.99 |
| fact_card_ui_and_print_markers_004 | set symbol for Abyss Eye JPN M5 | obs_set_symbol_001 | 0.99 |
| fact_card_ui_and_print_markers_005 | card number is 097/081 SR | obs_number_text_001 | 0.99 |
| fact_card_ui_and_print_markers_006 | illustrator text is 'Illus. 5ban Graphics' | obs_illustrator_text_001 | 0.99 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_and_print_markers_001",
    "fact_card_ui_and_print_markers_002",
    "fact_card_ui_and_print_markers_003",
    "fact_card_ui_and_print_markers_004",
    "fact_card_ui_and_print_markers_005",
    "fact_card_ui_and_print_markers_006"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_text_001"
  ],
  "hp_text_observation_ids": [
    "obs_hp_text_001"
  ],
  "collector_number_observation_ids": [
    "obs_number_text_001"
  ],
  "set_symbol_observation_ids": [
    "obs_set_symbol_001"
  ],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [],
  "bottom_line_text_observation_ids": [],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [
    "obs_energy_symbol_001"
  ],
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
| human_appearance | none_visible | none | not_applicable |  |
| creature_anatomy | complete | low | high |  |
| clothing | none_visible | none | not_applicable |  |
| objects_and_props | none_visible | none | not_applicable |  |
| environment | complete | low | medium |  |
| composition | none_visible | none | not_applicable |  |
| color_and_light | complete | low | high |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | complete | none | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| semantic_001 | state | floating | obs_subject_001 | obs_pose_001 | floating body floating stationary | 0.99 |
| semantic_003 | environment | abstract background |  | obs_background_001 | abstract background dark blue purple colors pink glowing symbol | 0.95 |

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
| floating Pokemon | obs_pose_001 |
| candle arms with flames | obs_creature_anatomy_002, obs_creature_anatomy_003 |
| purple black yellow orange colors | obs_creature_anatomy_004, obs_creature_anatomy_005, obs_creature_anatomy_006 |
| glowing flame tips | obs_lighting_001 |
| abstract background | obs_background_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| abstract background | obs_background_001 | deterministic_rule | 0.95 |
| centered composition | obs_creature_anatomy_001 | deterministic_rule | 0.98 |
| flame | obs_creature_anatomy_002, obs_creature_anatomy_003, obs_lighting_001 | deterministic_rule | 0.99 |
| floating | obs_action_state_001, obs_pose_001, obs_subject_001 | deterministic_rule | 0.99 |
| floating orientation | obs_action_state_001, obs_pose_001, obs_subject_001 | deterministic_rule | 0.99 |
| glowing highlights | obs_background_001, obs_creature_anatomy_003, obs_creature_anatomy_005, obs_lighting_001 | deterministic_rule | 0.99 |
| spiral motif | obs_creature_anatomy_004 | deterministic_rule | 0.99 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Chandelure. Visible observations: mega chandeler pokemon, central glass body region, candle arm with flame tip, multiple candle arms with glowing yellow flames, black swirling body parts, purple glowing accents on body, yellow highlights on black arms, floating orientation. Semantic facts: floating, abstract background.
- Quality flags: `none`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "Mega Chandelure Pokemon",
      "normalized_label": "mega chandeler pokemon",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_001",
      "kind": "feature",
      "label": "central glass body region",
      "normalized_label": "central glass body region",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_002",
      "kind": "feature",
      "label": "candle arm with flame tip",
      "normalized_label": "candle arm with flame tip",
      "scene_layer": "foreground",
      "frame_position": "left center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_003",
      "kind": "feature",
      "label": "multiple candle arms with glowing yellow flames",
      "normalized_label": "multiple candle arms with glowing yellow flames",
      "scene_layer": "foreground",
      "frame_position": "around center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_004",
      "kind": "feature",
      "label": "black swirling body parts",
      "normalized_label": "black swirling body parts",
      "scene_layer": "foreground",
      "frame_position": "around center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_005",
      "kind": "feature",
      "label": "purple glowing accents on body",
      "normalized_label": "purple glowing accents on body",
      "scene_layer": "foreground",
      "frame_position": "around center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "moderate"
    },
    {
      "observation_id": "obs_creature_anatomy_006",
      "kind": "feature",
      "label": "yellow highlights on black arms",
      "normalized_label": "yellow highlights on black arms",
      "scene_layer": "foreground",
      "frame_position": "around center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_001",
      "kind": "pose_orientation",
      "label": "floating orientation",
      "normalized_label": "floating orientation",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_action_state_001",
      "kind": "action_state",
      "label": "inactive, no limbs moving",
      "normalized_label": "inactive no limbs moving",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "moderate"
    },
    {
      "observation_id": "obs_background_001",
      "kind": "environment",
      "label": "abstract dark blue and purple background with pink glowing symbol",
      "normalized_label": "abstract dark blue purple background pink glowing symbol",
      "scene_layer": "background",
      "frame_position": "full card excluding subject area",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "moderate"
    },
    {
      "observation_id": "obs_palette_001",
      "kind": "color_palette",
      "label": "purple, black, yellow, blue and pink colors dominant",
      "normalized_label": "purple black yellow blue pink colors dominant",
      "scene_layer": "foreground background",
      "frame_position": "full image",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_lighting_001",
      "kind": "lighting",
      "label": "glowing flame tips with yellow and orange gradients",
      "normalized_label": "glowing flame tips yellow orange gradients",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_001",
      "kind": "card_ui_text",
      "label": "card name text in Japanese with 'ex'",
      "normalized_label": "card name japanese ex",
      "scene_layer": "midground",
      "frame_position": "top center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hp_text_001",
      "kind": "hp_text",
      "label": "HP 350",
      "normalized_label": "hp 350",
      "scene_layer": "midground",
      "frame_position": "top right",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_energy_symbol_001",
      "kind": "card_ui_symbol",
      "label": "Psychic Energy symbol",
      "normalized_label": "psychic energy symbol",
      "scene_layer": "midground",
      "frame_position": "top left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_type_symbol_001",
      "kind": "card_ui_symbol",
      "label": "Stage 2 evolution icon",
      "normalized_label": "stage 2 evolution icon",
      "scene_layer": "midground",
      "frame_position": "top left near energy symbol",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_illustrator_text_001",
      "kind": "illustrator_text",
      "label": "Illus. 5ban Graphics",
      "normalized_label": "illus 5ban graphics",
      "scene_layer": "midground",
      "frame_position": "bottom left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_number_text_001",
      "kind": "collector_number",
      "label": "097/081 SR",
      "normalized_label": "097 081 sr",
      "scene_layer": "midground",
      "frame_position": "bottom left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_set_symbol_001",
      "kind": "set_symbol",
      "label": "Set symbol for Abyss Eye (JPN M5)",
      "normalized_label": "abyss eye set symbol",
      "scene_layer": "midground",
      "frame_position": "bottom left near number",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_001",
      "module": "subjects",
      "field_path": "scene_subject.identity",
      "claim": "subject is Mega Chandelure Pokemon",
      "value": "Mega Chandelure",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_001",
      "module": "creature_anatomy",
      "field_path": "body_regions.central_body",
      "claim": "central body is glass lantern shaped",
      "value": "glass lantern shaped central body",
      "supporting_observation_ids": [
        "obs_creature_anatomy_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_002",
      "module": "creature_anatomy",
      "field_path": "body_regions.arms",
      "claim": "multiple candle arms with flame tips present",
      "value": "multiple candle arms with flame tips",
      "supporting_observation_ids": [
        "obs_creature_anatomy_002",
        "obs_creature_anatomy_003"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_003",
      "module": "creature_anatomy",
      "field_path": "coloration.body_colors",
      "claim": "body colors include black, purple, yellow and orange flames",
      "value": "black, purple, yellow, orange flames",
      "supporting_observation_ids": [
        "obs_creature_anatomy_004",
        "obs_creature_anatomy_005",
        "obs_creature_anatomy_006"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_pose_001",
      "module": "creature_anatomy",
      "field_path": "pose.orientation",
      "claim": "floating orientation",
      "value": "floating",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "background",
      "claim": "abstract dark blue and purple background with pink glowing symbol",
      "value": "abstract dark blue purple background pink glowing symbol",
      "supporting_observation_ids": [
        "obs_background_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "moderate"
    },
    {
      "fact_id": "fact_visual_design_001",
      "module": "color_and_light",
      "field_path": "palette.colors",
      "claim": "dominant palette includes purple, black, yellow, blue, pink",
      "value": "purple, black, yellow, blue, pink",
      "supporting_observation_ids": [
        "obs_palette_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_visual_design_002",
      "module": "color_and_light",
      "field_path": "lighting.effects",
      "claim": "yellow and orange glowing flame tips",
      "value": "yellow and orange glowing flame tips",
      "supporting_observation_ids": [
        "obs_lighting_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text contains Japanese text and 'ex' marker",
      "value": "Japanese text ex",
      "supporting_observation_ids": [
        "obs_card_ui_text_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_002",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text",
      "claim": "card HP is 350",
      "value": "350",
      "supporting_observation_ids": [
        "obs_hp_text_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_003",
      "module": "card_ui_and_print_markers",
      "field_path": "energy_symbol",
      "claim": "psychic energy symbol visible",
      "value": "psychic energy symbol",
      "supporting_observation_ids": [
        "obs_energy_symbol_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_004",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "set symbol for Abyss Eye JPN M5",
      "value": "abyss eye jpn m5",
      "supporting_observation_ids": [
        "obs_set_symbol_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_005",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "card number is 097/081 SR",
      "value": "097/081 SR",
      "supporting_observation_ids": [
        "obs_number_text_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_006",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator text is 'Illus. 5ban Graphics'",
      "value": "Illus. 5ban Graphics",
      "supporting_observation_ids": [
        "obs_illustrator_text_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "Mega Chandelure",
      "identity_confidence": 0.99,
      "anatomy": [
        "black swirling body parts",
        "central glass body",
        "multiple candle arms with flame tips",
        "purple glowing accents",
        "yellow highlights on arms"
      ],
      "physical_features": [
        "glass lantern shape",
        "glowing yellow-orange flames"
      ],
      "pose": [
        "floating"
      ],
      "orientation": "floating",
      "action_state": [
        "inactive"
      ],
      "facial_evidence": {
        "eyes": "cannot determine",
        "mouth": "cannot determine",
        "eyebrows": "cannot determine",
        "face_position": "front center",
        "other_visible_evidence": [
          "glowing yellow flame tips"
        ]
      },
      "clothing_or_accessories": [],
      "colors": [
        "black",
        "orange",
        "purple",
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
      "obs_action_state_001",
      "obs_creature_anatomy_001",
      "obs_creature_anatomy_002",
      "obs_creature_anatomy_003",
      "obs_creature_anatomy_004",
      "obs_creature_anatomy_005",
      "obs_creature_anatomy_006",
      "obs_lighting_001",
      "obs_pose_001",
      "obs_subject_001"
    ],
    "midground": [
      "obs_card_ui_text_001",
      "obs_energy_symbol_001",
      "obs_hp_text_001",
      "obs_illustrator_text_001",
      "obs_number_text_001",
      "obs_set_symbol_001",
      "obs_type_symbol_001"
    ],
    "background": [
      "obs_background_001"
    ]
  },
  "environment": {
    "setting": [
      "abstract background"
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
      "obs palette 001"
    ],
    "lighting": [
      "obs lighting 001"
    ],
    "shadows": [],
    "highlights": [
      "obs lighting 001"
    ],
    "composition": [],
    "camera_angle": "frontal",
    "framing": "central subject",
    "cropping": [],
    "depth": "medium",
    "motion_cues": [],
    "motifs": [],
    "repeated_shapes": [
      "obs creature anatomy 003"
    ],
    "style_cues": [
      "style",
      "glowing effects"
    ],
    "supporting_observation_ids": [
      "obs_creature_anatomy_003",
      "obs_lighting_001",
      "obs_palette_001"
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
        "fact_creature_anatomy_003"
      ],
      "body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "body",
          "feature": "central glass body region",
          "visibility": "fully_visible",
          "colors": [
            "purple"
          ],
          "details": [
            "glass lantern shaped"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_001"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "arms",
          "feature": "candle arms with flame tips",
          "visibility": "fully_visible",
          "colors": [
            "black",
            "orange",
            "yellow"
          ],
          "details": [
            "glowing yellow-orange flames",
            "multiple candle arms"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_002",
            "obs_creature_anatomy_003"
          ],
          "confidence": 0.99
        }
      ],
      "physical_features": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "body and arms",
          "feature": "black swirling body parts",
          "visibility": "fully_visible",
          "colors": [
            "black"
          ],
          "details": [
            "swirling shapes"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_004"
          ],
          "confidence": 0.99
        }
      ],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "floating"
          ],
          "orientation": "floating",
          "action_state": [
            "inactive"
          ],
          "supporting_observation_ids": [
            "obs_action_state_001",
            "obs_pose_001"
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
        "fact_visual_design_001",
        "fact_visual_design_002"
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
        "fact_card_ui_and_print_markers_001",
        "fact_card_ui_and_print_markers_002",
        "fact_card_ui_and_print_markers_003",
        "fact_card_ui_and_print_markers_004",
        "fact_card_ui_and_print_markers_005",
        "fact_card_ui_and_print_markers_006"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_text_001"
      ],
      "hp_text_observation_ids": [
        "obs_hp_text_001"
      ],
      "collector_number_observation_ids": [
        "obs_number_text_001"
      ],
      "set_symbol_observation_ids": [
        "obs_set_symbol_001"
      ],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [],
      "bottom_line_text_observation_ids": [],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [
        "obs_energy_symbol_001"
      ],
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
        "floating Pokemon",
        "candle arms with flames",
        "purple black yellow orange colors",
        "glowing flame tips",
        "abstract background"
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
      "review_status": "complete",
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
      "review_status": "complete",
      "omission_risk": "none",
      "evidence_quality": "high",
      "abstentions": []
    }
  ],
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "semantic_001",
      "category": "state",
      "label": "floating",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [],
        "eyebrows": [],
        "facial_features": [],
        "body_language": [
          "floating body"
        ],
        "body_position": [
          "floating"
        ],
        "motion_state": [
          "stationary"
        ],
        "environment": [],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.99,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "semantic_003",
      "category": "environment",
      "label": "abstract background",
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
        "motion_state": [],
        "environment": [
          "abstract background",
          "dark blue purple colors",
          "pink glowing symbol"
        ],
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
      "term": "floating Pokemon",
      "supporting_observation_ids": [
        "obs_pose_001"
      ]
    },
    {
      "term": "candle arms with flames",
      "supporting_observation_ids": [
        "obs_creature_anatomy_002",
        "obs_creature_anatomy_003"
      ]
    },
    {
      "term": "purple black yellow orange colors",
      "supporting_observation_ids": [
        "obs_creature_anatomy_004",
        "obs_creature_anatomy_005",
        "obs_creature_anatomy_006"
      ]
    },
    {
      "term": "glowing flame tips",
      "supporting_observation_ids": [
        "obs_lighting_001"
      ]
    },
    {
      "term": "abstract background",
      "supporting_observation_ids": [
        "obs_background_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "abstract background",
        "source_observation_ids": [
          "obs_background_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "centered composition",
        "source_observation_ids": [
          "obs_creature_anatomy_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "flame",
        "source_observation_ids": [
          "obs_creature_anatomy_002",
          "obs_creature_anatomy_003",
          "obs_lighting_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "floating",
        "source_observation_ids": [
          "obs_action_state_001",
          "obs_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "floating orientation",
        "source_observation_ids": [
          "obs_action_state_001",
          "obs_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "glowing highlights",
        "source_observation_ids": [
          "obs_background_001",
          "obs_creature_anatomy_003",
          "obs_creature_anatomy_005",
          "obs_lighting_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "spiral motif",
        "source_observation_ids": [
          "obs_creature_anatomy_004"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-078 - ムク

- Branch: `pokemon`
- Review status: `needs_review`
- Description confidence: `0.99`
- Attribute confidence: `0.98`
- Cost USD: `0.0090192`
- Artwork observations: `9`
- Card UI / print-marker observations: `0`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. Scene subjects: human character in illustration.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| human character in illustration | human character | scene_subject | foreground | primary_subject | 1 |
| human character has dark purple hair | dark purple hair | attribute | foreground | primary_subject_feature | 1 |
| headgear with black spiral shapes and white base with blue gem | headgear | objects_and_props | foreground | notable | 1 |
| white robe with yellow star pattern on sleeve, black garment underneath with blue belt and white-blue vertical stripes | white robe with markings and black garment | clothing | foreground | primary_subject_feature | 1 |
| human character right hand wearing blue glove | right hand blue glove | creature_anatomy | foreground | primary_subject_feature | 1 |
| human character has visible eyes, colored purple | purple eyes | human_appearance | foreground | primary_subject_feature | 1 |
| human character mouth visible, neutral expression | neutral mouth | human_appearance | foreground | primary_subject_feature | 0.9 |
| brick wall background with three arches, glowing lamps on walls | brick wall background | environment | background | background | 1 |
| floor with stone tile pattern and metal grate | stone tile floor and metal grate | environment | background | background | 1 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| none recorded | | | | |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | subjects | subject identity | obs_subject_001 | 1 |
| fact_002 | human_appearance | hair color | obs_hair_001 | 1 |
| fact_003 | creature_anatomy | headgear presence | obs_headgear_001 | 1 |
| fact_004 | clothing | garments worn | obs_clothing_001 | 1 |
| fact_005 | creature_anatomy | right hand wears blue glove | obs_hand_001 | 1 |
| fact_006 | human_appearance | eye color | obs_eye_001 | 1 |
| fact_007 | human_appearance | mouth expression | obs_mouth_001 | 0.9 |
| fact_008 | environment | background brick wall with arches and lamps | obs_env_001 | 1 |
| fact_009 | environment | background stone tile floor and metal grate | obs_env_002 | 1 |

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
| objects_and_props | likely_complete | low | high |  |
| environment | complete | none | high |  |
| composition | complete | none | high |  |
| color_and_light | complete | none | high |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | partial_due_to_low_resolution | medium | medium | name_text: text legible but some kanji detail uncertain; illustrator_text: text legible but small font uncertain |
| counts | none_visible | none | not_applicable |  |
| relationships | complete | none | high |  |
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

#### Relationships

| Relationship | Source | Target | Evidence |
|---|---|---|---|
| wearing | obs_subject_001 | obs_headgear_001 | strong |

#### Uncertainty And Abstentions

| Field | Reason | Affected observations |
|---|---|---|
| none recorded | | |

#### Search Terms

| Search term | Supporting observations |
|---|---|
| brick wall background | obs_env_001 |
| stone tile floor and metal grate | obs_env_002 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| forward orientation | obs_subject_001 | deterministic_rule | 1 |
| gloves | obs_hand_001 | deterministic_rule | 1 |
| glowing highlights | obs_env_001 | deterministic_rule | 0.92 |
| right hand raised near shoulder | obs_subject_001 | deterministic_rule | 1 |
| right orientation | obs_hand_001 | deterministic_rule | 1 |
| standing | obs_subject_001 | deterministic_rule | 1 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: human character in illustration.
- Quality flags: `potential_count_reference_inconsistent`, `potential_module_incomplete_or_low_evidence`, `potential_module_review_conflicts_with_entries`, `potential_unavailable_metadata_prompt_branch_mismatch`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "human character in illustration",
      "normalized_label": "human character",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary_subject",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hair_001",
      "kind": "attribute",
      "label": "human character has dark purple hair",
      "normalized_label": "dark purple hair",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary_subject_feature",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_headgear_001",
      "kind": "objects_and_props",
      "label": "headgear with black spiral shapes and white base with blue gem",
      "normalized_label": "headgear",
      "scene_layer": "foreground",
      "frame_position": "top_center",
      "visibility": "fully_visible",
      "salience": "notable",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_001",
      "kind": "clothing",
      "label": "white robe with yellow star pattern on sleeve, black garment underneath with blue belt and white-blue vertical stripes",
      "normalized_label": "white robe with markings and black garment",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary_subject_feature",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hand_001",
      "kind": "creature_anatomy",
      "label": "human character right hand wearing blue glove",
      "normalized_label": "right hand blue glove",
      "scene_layer": "foreground",
      "frame_position": "center_right",
      "visibility": "fully_visible",
      "salience": "primary_subject_feature",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_eye_001",
      "kind": "human_appearance",
      "label": "human character has visible eyes, colored purple",
      "normalized_label": "purple eyes",
      "scene_layer": "foreground",
      "frame_position": "center_face",
      "visibility": "fully_visible",
      "salience": "primary_subject_feature",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_mouth_001",
      "kind": "human_appearance",
      "label": "human character mouth visible, neutral expression",
      "normalized_label": "neutral mouth",
      "scene_layer": "foreground",
      "frame_position": "center_face",
      "visibility": "fully_visible",
      "salience": "primary_subject_feature",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_env_001",
      "kind": "environment",
      "label": "brick wall background with three arches, glowing lamps on walls",
      "normalized_label": "brick wall background",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "fully_visible",
      "salience": "background",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_env_002",
      "kind": "environment",
      "label": "floor with stone tile pattern and metal grate",
      "normalized_label": "stone tile floor and metal grate",
      "scene_layer": "background",
      "frame_position": "bottom",
      "visibility": "fully_visible",
      "salience": "background",
      "confidence": 1,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_001",
      "module": "subjects",
      "field_path": "scene_subject_identity",
      "claim": "subject identity",
      "value": "human character in illustration",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_002",
      "module": "human_appearance",
      "field_path": "hair_color",
      "claim": "hair color",
      "value": "dark purple",
      "supporting_observation_ids": [
        "obs_hair_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_003",
      "module": "creature_anatomy",
      "field_path": "headgear_presence",
      "claim": "headgear presence",
      "value": "headgear with black spiral shapes and white base with blue gem is worn",
      "supporting_observation_ids": [
        "obs_headgear_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "clothing",
      "field_path": "garments",
      "claim": "garments worn",
      "value": "white robe with yellow star pattern on sleeve, black garment underneath with blue belt and white-blue vertical stripes",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_005",
      "module": "creature_anatomy",
      "field_path": "hand_wear",
      "claim": "right hand wears blue glove",
      "value": "right hand wearing blue glove",
      "supporting_observation_ids": [
        "obs_hand_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_006",
      "module": "human_appearance",
      "field_path": "eye_color",
      "claim": "eye color",
      "value": "purple eyes",
      "supporting_observation_ids": [
        "obs_eye_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_007",
      "module": "human_appearance",
      "field_path": "mouth_expression",
      "claim": "mouth expression",
      "value": "",
      "supporting_observation_ids": [
        "obs_mouth_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_008",
      "module": "environment",
      "field_path": "background_walls",
      "claim": "background brick wall with arches and lamps",
      "value": "brick wall with arches and glowing lamps",
      "supporting_observation_ids": [
        "obs_env_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_009",
      "module": "environment",
      "field_path": "background_floor",
      "claim": "background stone tile floor and metal grate",
      "value": "stone tile floor and metal grate",
      "supporting_observation_ids": [
        "obs_env_002"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "human character in illustration",
      "identity_confidence": 1,
      "anatomy": [
        "arms",
        "eyes",
        "hair",
        "hands",
        "head",
        "mouth",
        "torso"
      ],
      "physical_features": [
        "blue glove on right hand",
        "dark purple hair",
        "purple eyes"
      ],
      "pose": [
        "right hand raised near shoulder",
        "standing"
      ],
      "orientation": "forward",
      "action_state": [],
      "facial_evidence": {
        "eyes": "visible",
        "mouth": "neutral",
        "eyebrows": "visible",
        "face_position": "centered",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [
        "black inner garment with blue belt",
        "white robe with star pattern on sleeve"
      ],
      "colors": [
        "black",
        "blue",
        "dark purple",
        "white",
        "yellow"
      ],
      "visibility": "fully visible"
    }
  ],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [],
  "scene_layers": {
    "foreground": [
      "obs_clothing_001",
      "obs_eye_001",
      "obs_hair_001",
      "obs_hand_001",
      "obs_headgear_001",
      "obs_mouth_001",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_env_001",
      "obs_env_002"
    ]
  },
  "environment": {
    "setting": [
      "indoor"
    ],
    "indoor_outdoor": "indoor",
    "sky": [],
    "ground": [
      "metal grate",
      "stone tile floor"
    ],
    "terrain": [],
    "plants": [],
    "architecture": [
      "arches",
      "brick wall"
    ],
    "water": [],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_env_001",
      "obs_env_002"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_headgear_001",
      "label": "headgear with black spiral shapes and white base with blue gem",
      "normalized_label": "headgear",
      "object_type": "headgear",
      "colors": [
        "black",
        "blue",
        "white"
      ],
      "material_appearance": [
        "fabric-like appearance-like",
        "smooth"
      ],
      "location": "on head",
      "count_reference": "count_001",
      "confidence": 1
    }
  ],
  "relationships": [
    {
      "relationship_id": "rel_001",
      "source_observation_id": "obs_subject_001",
      "target_observation_id": "obs_headgear_001",
      "relationship": "wearing",
      "evidence_strength": "strong"
    }
  ],
  "visual_design": {
    "palette": [
      "black",
      "blue",
      "brown",
      "orange",
      "purple",
      "white",
      "yellow"
    ],
    "lighting": [
      "lamp light",
      "soft indoor lighting"
    ],
    "shadows": [
      "soft shadows on floor and walls"
    ],
    "highlights": [
      "glowing lamps on wall"
    ],
    "composition": [
      "centered subject",
      "symmetrical background with arches"
    ],
    "camera_angle": "eye-level",
    "framing": "medium close-up",
    "cropping": [],
    "depth": "moderate depth with clear background",
    "motion_cues": [],
    "motifs": [
      "spiral shapes on headgear",
      "star pattern on sleeve"
    ],
    "repeated_shapes": [
      "arches in background"
    ],
    "style_cues": [
      "digital art"
    ],
    "supporting_observation_ids": [
      "obs_env_001",
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
        "fact_006",
        "fact_007"
      ],
      "visible_body_regions": [],
      "facial_evidence": [
        {
          "subject_observation_id": "obs_subject_001",
          "face_position": "centered",
          "eyes": "visible purple eyes",
          "mouth": "",
          "eyebrows": "visible",
          "other_visible_evidence": [],
          "supporting_observation_ids": [
            "obs_eye_001",
            "obs_mouth_001"
          ],
          "confidence": 0.95
        }
      ],
      "hair": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "dark purple hair",
          "details": [],
          "supporting_observation_ids": [
            "obs_hair_001"
          ],
          "confidence": 1
        }
      ],
      "gestures": [],
      "accessories": []
    },
    "creature_anatomy": {
      "fact_ids": [
        "fact_003",
        "fact_005"
      ],
      "body_regions": [],
      "physical_features": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "right hand",
          "feature": "blue glove",
          "visibility": "fully_visible",
          "colors": [
            "blue"
          ],
          "details": [],
          "supporting_observation_ids": [
            "obs_hand_001"
          ],
          "confidence": 1
        }
      ],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "right hand raised near shoulder",
            "standing"
          ],
          "orientation": "forward",
          "action_state": [],
          "supporting_observation_ids": [
            "obs_subject_001"
          ],
          "confidence": 1
        }
      ],
      "effects": []
    },
    "clothing": {
      "fact_ids": [
        "fact_004"
      ],
      "garments": [
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "body and arms",
          "garment": "white robe with yellow star pattern on sleeve",
          "neckline_type": "cannot determine",
          "sleeve_type": "long sleeves",
          "colors": [
            "white",
            "yellow"
          ],
          "visible_details": [
            "star pattern on sleeve"
          ],
          "supporting_observation_ids": [
            "obs_clothing_001"
          ],
          "confidence": 1
        }
      ],
      "accessories": []
    },
    "objects_and_props": {
      "fact_ids": [],
      "object_observation_ids": [
        "obs_headgear_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_008",
        "fact_009"
      ],
      "observation_ids": [
        "obs_env_001",
        "obs_env_002"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_env_001",
        "obs_subject_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_env_001",
        "obs_subject_001"
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
        "brick wall background",
        "stone tile floor and metal grate"
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
      "review_status": "likely_complete",
      "omission_risk": "low",
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
          "field_path": "name_text",
          "reason": "text legible but some kanji detail uncertain",
          "affected_observation_ids": []
        },
        {
          "field_path": "illustrator_text",
          "reason": "text legible but small font uncertain",
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
      "review_status": "complete",
      "omission_risk": "none",
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
      "term": "brick wall background",
      "supporting_observation_ids": [
        "obs_env_001"
      ]
    },
    {
      "term": "stone tile floor and metal grate",
      "supporting_observation_ids": [
        "obs_env_002"
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
        "confidence": 1
      },
      {
        "concept": "gloves",
        "source_observation_ids": [
          "obs_hand_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "glowing highlights",
        "source_observation_ids": [
          "obs_env_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "right hand raised near shoulder",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "right orientation",
        "source_observation_ids": [
          "obs_hand_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "standing",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-108 - Misty's Vitality

- Branch: `trainer`
- Review status: `pending`
- Description confidence: `0.97`
- Attribute confidence: `0.96`
- Cost USD: `0.0107288`
- Artwork observations: `8`
- Card UI / print-marker observations: `7`
- Card UI module evidence references: `8`
- Derived digest: Fact digest. Scene subjects: human female character.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| human female character | human female | scene_subject | foreground | primary | 0.99 |
| orange spiky hair tied with black hair tie in side ponytail | orange hair side ponytail | human_hair | foreground | primary | 0.98 |
| face with large cyan blue eyes, open mouth, smiling expression | face smiling | human_face | foreground | primary | 0.98 |
| blue sleeveless athletic top | blue sleeveless top | clothing | foreground | primary | 0.99 |
| blue athletic shorts | blue shorts | clothing | foreground | primary | 0.99 |
| black wristband on right wrist | black wristband right wrist | human_accessory | foreground | primary | 0.96 |
| standing in a fighting stance, left fist clenched in front, right arm extended back | standing fighting stance | human_pose | foreground | primary | 0.98 |
| indoor swimming pool background with pool water surface and a bench | indoor swimming pool | environment | background | secondary | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text in Japanese at top left | card_ui_text | upper edge | fully_visible | 0.99 |
| Trainer label in Japanese at top right | card_ui_text | upper edge | fully_visible | 0.99 |
| Supporter label in Japanese at top left corner above name | card_ui_text | upper edge | fully_visible | 0.99 |
| illustrator text 'Illus. En Morikura' at bottom left of artwork circle | illustrator_text | lower left | fully_visible | 0.97 |
| set symbol and set code 'J M5' at bottom left near illustrator text | card_ui_text | lower left | fully_visible | 0.97 |
| collector number '108/081 SR' at bottom left | collector_number | lower left | fully_visible | 0.97 |
| copyright and other text line at bottom edge | bottom_line_text | bottom edge | fully_visible | 0.95 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | scene subject | obs_subject_001 | 0.99 |
| fact_hair_001 | human_appearance | hair style and color | obs_hair_001 | 0.98 |
| fact_face_001 | human_appearance | facial expression | obs_face_001 | 0.98 |
| fact_clothing_001 | clothing | wearing blue sleeveless athletic top | obs_clothing_001 | 0.99 |
| fact_clothing_002 | clothing | wearing blue athletic shorts | obs_clothing_002 | 0.99 |
| fact_accessories_001 | clothing | wearing black wristband on right wrist | obs_accessories_001 | 0.96 |
| fact_pose_001 | human_appearance | pose standing fighting stance | obs_posture_001 | 0.98 |
| fact_environment_001 | environment | indoor swimming pool setting | obs_environment_001 | 0.95 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_name_text_001 | card name text in Japanese | obs_card_ui_name_text_001 | 0.99 |
| fact_card_ui_trainer_text_001 | trainer label in Japanese | obs_card_ui_trainer_text_001 | 0.99 |
| fact_card_ui_supporter_text_001 | supporter label in Japanese | obs_card_ui_supporter_text_001 | 0.99 |
| fact_illustrator_001 | illustrator credit | obs_card_ui_illustrator_001 | 0.97 |
| fact_set_code_001 | set symbol and code visible | obs_card_ui_set_code_001 | 0.97 |
| fact_card_number_001 | collector number visible | obs_card_ui_card_number_001 | 0.97 |
| fact_card_ui_bottom_text_001 | copyright and legal text line visible | obs_card_ui_bottom_text_001 | 0.95 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_number_001",
    "fact_card_ui_bottom_text_001",
    "fact_card_ui_name_text_001",
    "fact_card_ui_supporter_text_001",
    "fact_card_ui_trainer_text_001",
    "fact_illustrator_001",
    "fact_set_code_001"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_name_text_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_card_ui_card_number_001"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_set_code_001"
  ],
  "rarity_mark_observation_ids": [
    "obs_card_ui_card_number_001"
  ],
  "copyright_line_observation_ids": [
    "obs_card_ui_bottom_text_001"
  ],
  "bottom_line_text_observation_ids": [
    "obs_card_ui_bottom_text_001"
  ],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_card_ui_illustrator_001"
  ],
  "error_marker_observation_ids": [],
  "other_print_marker_observation_ids": [
    "obs_card_ui_supporter_text_001"
  ]
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
| environment | complete | none | high |  |
| composition | complete | none | high |  |
| color_and_light | complete | none | high |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | complete | none | high |  |

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
| orange hair | obs_hair_001 |
| blue clothing | obs_clothing_001, obs_clothing_002 |
| fighting stance | obs_posture_001 |
| indoor swimming pool | obs_environment_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| forward orientation | obs_subject_001 | deterministic_rule | 0.99 |
| right orientation | obs_accessories_001 | deterministic_rule | 0.96 |
| sleeveless clothing | obs_clothing_001 | deterministic_rule | 0.99 |
| standing | obs_posture_001, obs_subject_001 | deterministic_rule | 0.99 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: human female character.
- Quality flags: `none`
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
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hair_001",
      "kind": "human_hair",
      "label": "orange spiky hair tied with black hair tie in side ponytail",
      "normalized_label": "orange hair side ponytail",
      "scene_layer": "foreground",
      "frame_position": "head",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_face_001",
      "kind": "human_face",
      "label": "face with large cyan blue eyes, open mouth, smiling expression",
      "normalized_label": "face smiling",
      "scene_layer": "foreground",
      "frame_position": "head",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_001",
      "kind": "clothing",
      "label": "blue sleeveless athletic top",
      "normalized_label": "blue sleeveless top",
      "scene_layer": "foreground",
      "frame_position": "torso",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_002",
      "kind": "clothing",
      "label": "blue athletic shorts",
      "normalized_label": "blue shorts",
      "scene_layer": "foreground",
      "frame_position": "lower_body",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_accessories_001",
      "kind": "human_accessory",
      "label": "black wristband on right wrist",
      "normalized_label": "black wristband right wrist",
      "scene_layer": "foreground",
      "frame_position": "right wrist",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_posture_001",
      "kind": "human_pose",
      "label": "standing in a fighting stance, left fist clenched in front, right arm extended back",
      "normalized_label": "standing fighting stance",
      "scene_layer": "foreground",
      "frame_position": "full body",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "indoor swimming pool background with pool water surface and a bench",
      "normalized_label": "indoor swimming pool",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "fully_visible",
      "salience": "secondary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_text_001",
      "kind": "card_ui_text",
      "label": "card name text in Japanese at top left",
      "normalized_label": "card name text Japanese",
      "scene_layer": "foreground",
      "frame_position": "upper edge",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_trainer_text_001",
      "kind": "card_ui_text",
      "label": "Trainer label in Japanese at top right",
      "normalized_label": "trainer label Japanese",
      "scene_layer": "foreground",
      "frame_position": "upper edge",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_supporter_text_001",
      "kind": "card_ui_text",
      "label": "Supporter label in Japanese at top left corner above name",
      "normalized_label": "supporter label Japanese",
      "scene_layer": "foreground",
      "frame_position": "upper edge",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_illustrator_001",
      "kind": "illustrator_text",
      "label": "illustrator text 'Illus. En Morikura' at bottom left of artwork circle",
      "normalized_label": "illustrator text",
      "scene_layer": "foreground",
      "frame_position": "lower left",
      "visibility": "fully_visible",
      "salience": "secondary",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_code_001",
      "kind": "card_ui_text",
      "label": "set symbol and set code 'J M5' at bottom left near illustrator text",
      "normalized_label": "set symbol and set code",
      "scene_layer": "foreground",
      "frame_position": "lower left",
      "visibility": "fully_visible",
      "salience": "secondary",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_card_number_001",
      "kind": "collector_number",
      "label": "collector number '108/081 SR' at bottom left",
      "normalized_label": "collector number",
      "scene_layer": "foreground",
      "frame_position": "lower left",
      "visibility": "fully_visible",
      "salience": "secondary",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_bottom_text_001",
      "kind": "bottom_line_text",
      "label": "copyright and other text line at bottom edge",
      "normalized_label": "copyright bottom text",
      "scene_layer": "foreground",
      "frame_position": "bottom edge",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.95,
      "evidence_strength": "medium"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_001",
      "module": "subjects",
      "field_path": "scene_subject.identity",
      "claim": "scene subject",
      "value": "human female character",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_hair_001",
      "module": "human_appearance",
      "field_path": "hair.label",
      "claim": "hair style and color",
      "value": "orange spiky hair tied with black hair tie side ponytail",
      "supporting_observation_ids": [
        "obs_hair_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_face_001",
      "module": "human_appearance",
      "field_path": "face.facial_evidence",
      "claim": "facial expression",
      "value": "smiling open mouth",
      "supporting_observation_ids": [
        "obs_face_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_001",
      "module": "clothing",
      "field_path": "garments.torso.garment",
      "claim": "wearing blue sleeveless athletic top",
      "value": "blue sleeveless athletic top",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_002",
      "module": "clothing",
      "field_path": "garments.lower_body.garment",
      "claim": "wearing blue athletic shorts",
      "value": "blue athletic shorts",
      "supporting_observation_ids": [
        "obs_clothing_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_accessories_001",
      "module": "clothing",
      "field_path": "accessories.wristband",
      "claim": "wearing black wristband on right wrist",
      "value": "black wristband right wrist",
      "supporting_observation_ids": [
        "obs_accessories_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_pose_001",
      "module": "human_appearance",
      "field_path": "pose.action_state",
      "claim": "pose standing fighting stance",
      "value": "standing in fighting stance with left fist clenched, right arm extended back",
      "supporting_observation_ids": [
        "obs_posture_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "setting.indoor",
      "claim": "indoor swimming pool setting",
      "value": "indoor swimming pool with pool surface and bench",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_name_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text in Japanese",
      "value": "カスミの元気 (Misty's Vitality)",
      "supporting_observation_ids": [
        "obs_card_ui_name_text_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_trainer_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "trainer label in Japanese",
      "value": "トレーナーズ (Trainer)",
      "supporting_observation_ids": [
        "obs_card_ui_trainer_text_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_supporter_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "other_print_marker",
      "claim": "supporter label in Japanese",
      "value": "サポート (Supporter)",
      "supporting_observation_ids": [
        "obs_card_ui_supporter_text_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_illustrator_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator credit",
      "value": "Illus. En Morikura",
      "supporting_observation_ids": [
        "obs_card_ui_illustrator_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_set_code_001",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "set symbol and code visible",
      "value": "J M5",
      "supporting_observation_ids": [
        "obs_card_ui_set_code_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_number_001",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "collector number visible",
      "value": "108/081 SR",
      "supporting_observation_ids": [
        "obs_card_ui_card_number_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_bottom_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line",
      "claim": "copyright and legal text line visible",
      "value": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "supporting_observation_ids": [
        "obs_card_ui_bottom_text_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "medium"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "human female character",
      "identity_confidence": 0.99,
      "anatomy": [
        "arms",
        "face",
        "feet",
        "hands",
        "legs",
        "neck",
        "shoulders",
        "upper chest"
      ],
      "physical_features": [
        "orange spiky hair side ponytail"
      ],
      "pose": [
        "standing"
      ],
      "orientation": "forward",
      "action_state": [
        "fighting posture",
        "standing"
      ],
      "facial_evidence": {
        "eyes": "large cyan blue eyes",
        "mouth": "open smiling mouth",
        "eyebrows": "neutral",
        "face_position": "frontal",
        "other_visible_evidence": [
          "face fully visible"
        ]
      },
      "clothing_or_accessories": [
        "black wristband right wrist",
        "blue athletic shorts",
        "blue sleeveless top"
      ],
      "colors": [
        "black",
        "blue",
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
      "obs_accessories_001",
      "obs_card_ui_bottom_text_001",
      "obs_card_ui_card_number_001",
      "obs_card_ui_illustrator_001",
      "obs_card_ui_name_text_001",
      "obs_card_ui_set_code_001",
      "obs_card_ui_supporter_text_001",
      "obs_card_ui_trainer_text_001",
      "obs_clothing_001",
      "obs_clothing_002",
      "obs_face_001",
      "obs_hair_001",
      "obs_posture_001",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_environment_001"
    ]
  },
  "environment": {
    "setting": [
      "indoor swimming pool"
    ],
    "indoor_outdoor": "indoor",
    "sky": [],
    "ground": [
      "pool water"
    ],
    "terrain": [],
    "plants": [],
    "architecture": [
      "bench"
    ],
    "water": [
      "indoor pool water"
    ],
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
      "black",
      "blue",
      "cyan",
      "orange",
      "white"
    ],
    "lighting": [
      "even indoor lighting with highlights on hair and water"
    ],
    "shadows": [
      "soft shadows under subject"
    ],
    "highlights": [
      "hair shine spots",
      "water reflections"
    ],
    "composition": [
      "centralized subject",
      "frontal pose",
      "symmetrical framing"
    ],
    "camera_angle": "eye-level",
    "framing": "medium full-body",
    "cropping": [
      "full subject visible with surrounding environment"
    ],
    "depth": "shallow",
    "motion_cues": [
      "clenched fists",
      "forward stance",
      "implied punching motion"
    ],
    "motifs": [
      "sports",
      "training",
      "water"
    ],
    "repeated_shapes": [
      "rectangular pool tiles",
      "spiky hair"
    ],
    "style_cues": [
      "bright colors",
      "clean lines"
    ],
    "supporting_observation_ids": [
      "obs_environment_001",
      "obs_face_001",
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
        "fact_pose_001"
      ],
      "visible_body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "face",
          "visibility": "fully_visible",
          "details": [
            "large cyan blue eyes",
            "open mouth smiling"
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
          "eyes": "large cyan blue eyes",
          "mouth": "open smiling mouth",
          "eyebrows": "neutral",
          "other_visible_evidence": [
            "face fully visible"
          ],
          "supporting_observation_ids": [
            "obs_face_001"
          ],
          "confidence": 0.98
        }
      ],
      "hair": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "orange spiky hair side ponytail",
          "details": [
            "bright orange color",
            "hair tied with black hair tie on side",
            "spiky hair strands"
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
          "label": "fighting stance gesture",
          "details": [
            "left fist clenched forward",
            "right arm extended back"
          ],
          "supporting_observation_ids": [
            "obs_posture_001"
          ],
          "confidence": 0.98
        }
      ],
      "accessories": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "black wristband on right wrist",
          "details": [
            "plain black band",
            "worn on right wrist"
          ],
          "supporting_observation_ids": [
            "obs_accessories_001"
          ],
          "confidence": 0.96
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
        "fact_accessories_001",
        "fact_clothing_001",
        "fact_clothing_002"
      ],
      "garments": [
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "torso",
          "garment": "blue sleeveless athletic top",
          "neckline_type": "round neckline",
          "sleeve_type": "sleeveless",
          "colors": [
            "blue"
          ],
          "visible_details": [
            "fitted athletic style"
          ],
          "supporting_observation_ids": [
            "obs_clothing_001"
          ],
          "confidence": 0.99
        },
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "lower body",
          "garment": "blue athletic shorts",
          "neckline_type": "",
          "sleeve_type": "",
          "colors": [
            "blue"
          ],
          "visible_details": [
            "fitted shorts"
          ],
          "supporting_observation_ids": [
            "obs_clothing_002"
          ],
          "confidence": 0.99
        }
      ],
      "accessories": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "black wristband on right wrist",
          "details": [
            "plain black band"
          ],
          "supporting_observation_ids": [
            "obs_accessories_001"
          ],
          "confidence": 0.96
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
        "obs_clothing_001",
        "obs_environment_001",
        "obs_face_001",
        "obs_hair_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": []
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_number_001",
        "fact_card_ui_bottom_text_001",
        "fact_card_ui_name_text_001",
        "fact_card_ui_supporter_text_001",
        "fact_card_ui_trainer_text_001",
        "fact_illustrator_001",
        "fact_set_code_001"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_name_text_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_card_ui_card_number_001"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_set_code_001"
      ],
      "rarity_mark_observation_ids": [
        "obs_card_ui_card_number_001"
      ],
      "copyright_line_observation_ids": [
        "obs_card_ui_bottom_text_001"
      ],
      "bottom_line_text_observation_ids": [
        "obs_card_ui_bottom_text_001"
      ],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_card_ui_illustrator_001"
      ],
      "error_marker_observation_ids": [],
      "other_print_marker_observation_ids": [
        "obs_card_ui_supporter_text_001"
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
        "orange hair",
        "blue clothing",
        "fighting stance",
        "indoor swimming pool"
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
      "term": "orange hair",
      "supporting_observation_ids": [
        "obs_hair_001"
      ]
    },
    {
      "term": "blue clothing",
      "supporting_observation_ids": [
        "obs_clothing_001",
        "obs_clothing_002"
      ]
    },
    {
      "term": "fighting stance",
      "supporting_observation_ids": [
        "obs_posture_001"
      ]
    },
    {
      "term": "indoor swimming pool",
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
        "concept": "right orientation",
        "source_observation_ids": [
          "obs_accessories_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.96
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
        "concept": "standing",
        "source_observation_ids": [
          "obs_posture_001",
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

### GV-PK-JPN-M5-109 - Gladion's Final Battle

- Branch: `trainer`
- Review status: `needs_review`
- Description confidence: `0.99`
- Attribute confidence: `0.98`
- Cost USD: `0.0111756`
- Artwork observations: `10`
- Card UI / print-marker observations: `7`
- Card UI module evidence references: `8`
- Derived digest: Fact digest. Scene subjects: human male figure. Semantic facts: standing.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| human male figure | human male figure | scene_subject | foreground | primary | 0.99 |
| blond hair with sharp angular style | blond hair | object | foreground | primary | 0.99 |
| green left eye | green eye | object | foreground | primary | 0.98 |
| ear with three pink ear piercings | ear with piercings | object | foreground | secondary | 0.95 |
| black hoodie with red emblem and high collar with shoulders spikes | black hoodie with emblem | object | foreground | primary | 0.99 |
| dark red satchel bag worn across body | dark red bag | object | foreground | secondary | 0.95 |
| human male standing with left arm raised and right arm down | standing posture with raised left arm | object | foreground | primary | 0.98 |
| left hand open with fingers curled slightly inward | left hand gesture | object | foreground | primary | 0.97 |
| right hand open with fingers relaxed downward | right hand gesture | object | foreground | secondary | 0.97 |
| outdoor setting with green-grassy hill and cloudy sky | outdoor grassy hill with cloudy sky | environment | background | secondary | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text in Japanese at top left | card_ui_text | top left | visible | 0.99 |
| supporter text in red top left | card_ui_text | top left | visible | 0.98 |
| trainer category text in Japanese top right | card_ui_text | top right | visible | 0.99 |
| Japanese descriptive text in middle left area | card_ui_text | mid left | visible | 0.95 |
| illustrator credit text 'Illus. akagi' bottom left | illustrator_text | bottom left | visible | 0.99 |
| set code 'J M5' above card number bottom left | card_ui_text | bottom left | visible | 0.98 |
| card number 109/081 SR bottom left | collector_number | bottom left | visible | 0.99 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | identity | obs_subject_001 | 0.99 |
| fact_hair_001 | human_appearance | hair color and style | obs_hair_001 | 0.99 |
| fact_eye_001 | human_appearance | eye color | obs_eye_left_001 | 0.98 |
| fact_ear_001 | human_appearance | ear piercings | obs_ear_001 | 0.95 |
| fact_clothing_hoodie_001 | clothing | hoodie style and colors | obs_clothing_hoodie_001 | 0.99 |
| fact_clothing_bag_001 | clothing | bag worn on body | obs_clothing_bag_001 | 0.95 |
| fact_pose_001 | creature_anatomy | human standing posture | obs_posture_001 | 0.98 |
| fact_gesture_left_001 | human_appearance | left hand gesture | obs_hand_left_001 | 0.97 |
| fact_gesture_right_001 | human_appearance | right hand gesture | obs_hand_right_001 | 0.97 |
| fact_environment_001 | environment | environment setting | obs_background_001 | 0.95 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_name_001 | card name text | obs_card_ui_name_001 | 0.99 |
| fact_card_ui_supporter_001 | supporter text red top left | obs_card_ui_subtitle_001 | 0.98 |
| fact_card_ui_trainer_001 | trainer category text | obs_card_ui_trainer_001 | 0.99 |
| fact_card_ui_text_japanese_001 | Japanese descriptive text | obs_card_ui_text_japanese_001 | 0.95 |
| fact_card_ui_illustrator_001 | illustrator credit | obs_card_ui_illustrator_001 | 0.99 |
| fact_card_ui_set_code_001 | set code and number | obs_card_ui_set_code_001 | 0.98 |
| fact_card_ui_card_number_001 | card number and rarity | obs_card_ui_card_number_001 | 0.99 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_card_number_001",
    "fact_card_ui_illustrator_001",
    "fact_card_ui_name_001",
    "fact_card_ui_set_code_001",
    "fact_card_ui_supporter_001",
    "fact_card_ui_text_japanese_001",
    "fact_card_ui_trainer_001"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_name_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_card_ui_card_number_001"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_set_code_001"
  ],
  "rarity_mark_observation_ids": [
    "obs_card_ui_card_number_001"
  ],
  "copyright_line_observation_ids": [],
  "bottom_line_text_observation_ids": [
    "obs_card_ui_text_japanese_001"
  ],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_card_ui_illustrator_001"
  ],
  "error_marker_observation_ids": [],
  "other_print_marker_observation_ids": [
    "obs_card_ui_subtitle_001",
    "obs_card_ui_trainer_001"
  ]
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
| objects_and_props | likely_complete | low | high |  |
| environment | complete | none | high |  |
| composition | complete | none | high |  |
| color_and_light | complete | none | high |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | complete | none | high |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | likely_complete | low | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| sf1 | state | standing | obs_subject_001 | obs_posture_001 | neutral open neutral left arm raised right arm down standing obs clothing bag 001 obs clothing hoodie 001 rel 001 | 0.98 |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|

#### Relationships

| Relationship | Source | Target | Evidence |
|---|---|---|---|
| wearing | obs_subject_001 | obs_clothing_bag_001 | strong |

#### Uncertainty And Abstentions

| Field | Reason | Affected observations |
|---|---|---|
| none recorded | | |

#### Search Terms

| Search term | Supporting observations |
|---|---|
| human male blond hair | obs_hair_001 |
| black hoodie with red emblem | obs_clothing_hoodie_001 |
| green eyes | obs_eye_left_001 |
| dark red bag worn across body | obs_clothing_bag_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| forward orientation | obs_posture_001, obs_subject_001 | deterministic_rule | 0.99 |
| left orientation | obs_hand_left_001 | deterministic_rule | 0.97 |
| sky | obs_background_001 | deterministic_rule | 0.95 |
| standing | obs_posture_001, obs_subject_001 | deterministic_rule | 0.99 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: human male figure. Semantic facts: standing.
- Quality flags: `potential_module_fact_reference_missing`, `potential_pose_or_action_without_visible_support`
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
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hair_001",
      "kind": "object",
      "label": "blond hair with sharp angular style",
      "normalized_label": "blond hair",
      "scene_layer": "foreground",
      "frame_position": "upper center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_eye_left_001",
      "kind": "object",
      "label": "green left eye",
      "normalized_label": "green eye",
      "scene_layer": "foreground",
      "frame_position": "left face",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_ear_001",
      "kind": "object",
      "label": "ear with three pink ear piercings",
      "normalized_label": "ear with piercings",
      "scene_layer": "foreground",
      "frame_position": "left side of head",
      "visibility": "visible",
      "salience": "secondary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_hoodie_001",
      "kind": "object",
      "label": "black hoodie with red emblem and high collar with shoulders spikes",
      "normalized_label": "black hoodie with emblem",
      "scene_layer": "foreground",
      "frame_position": "central torso",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_bag_001",
      "kind": "object",
      "label": "dark red satchel bag worn across body",
      "normalized_label": "dark red bag",
      "scene_layer": "foreground",
      "frame_position": "waist area",
      "visibility": "visible",
      "salience": "secondary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_posture_001",
      "kind": "object",
      "label": "human male standing with left arm raised and right arm down",
      "normalized_label": "standing posture with raised left arm",
      "scene_layer": "foreground",
      "frame_position": "full figure",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hand_left_001",
      "kind": "object",
      "label": "left hand open with fingers curled slightly inward",
      "normalized_label": "left hand gesture",
      "scene_layer": "foreground",
      "frame_position": "left hand visible",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hand_right_001",
      "kind": "object",
      "label": "right hand open with fingers relaxed downward",
      "normalized_label": "right hand gesture",
      "scene_layer": "foreground",
      "frame_position": "right hand visible",
      "visibility": "visible",
      "salience": "secondary",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_background_001",
      "kind": "environment",
      "label": "outdoor setting with green-grassy hill and cloudy sky",
      "normalized_label": "outdoor grassy hill with cloudy sky",
      "scene_layer": "background",
      "frame_position": "behind subject",
      "visibility": "visible",
      "salience": "secondary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_001",
      "kind": "card_ui_text",
      "label": "card name text in Japanese at top left",
      "normalized_label": "card name text",
      "scene_layer": "ui",
      "frame_position": "top left",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_subtitle_001",
      "kind": "card_ui_text",
      "label": "supporter text in red top left",
      "normalized_label": "supporter text",
      "scene_layer": "ui",
      "frame_position": "top left",
      "visibility": "visible",
      "salience": "secondary",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_trainer_001",
      "kind": "card_ui_text",
      "label": "trainer category text in Japanese top right",
      "normalized_label": "trainer category text",
      "scene_layer": "ui",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_japanese_001",
      "kind": "card_ui_text",
      "label": "Japanese descriptive text in middle left area",
      "normalized_label": "description text",
      "scene_layer": "ui",
      "frame_position": "mid left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_illustrator_001",
      "kind": "illustrator_text",
      "label": "illustrator credit text 'Illus. akagi' bottom left",
      "normalized_label": "illustrator text",
      "scene_layer": "ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "secondary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_code_001",
      "kind": "card_ui_text",
      "label": "set code 'J M5' above card number bottom left",
      "normalized_label": "set code text",
      "scene_layer": "ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "secondary",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_card_number_001",
      "kind": "collector_number",
      "label": "card number 109/081 SR bottom left",
      "normalized_label": "card number",
      "scene_layer": "ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_001",
      "module": "subjects",
      "field_path": "scene_subject.identity",
      "claim": "identity",
      "value": "human male figure",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_hair_001",
      "module": "human_appearance",
      "field_path": "hair.label",
      "claim": "hair color and style",
      "value": "blond with sharp angular style",
      "supporting_observation_ids": [
        "obs_hair_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_eye_001",
      "module": "human_appearance",
      "field_path": "face.eyes.color",
      "claim": "eye color",
      "value": "green left eye",
      "supporting_observation_ids": [
        "obs_eye_left_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ear_001",
      "module": "human_appearance",
      "field_path": "physical_features.ear.piercings",
      "claim": "ear piercings",
      "value": "three pink piercings in left ear",
      "supporting_observation_ids": [
        "obs_ear_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_hoodie_001",
      "module": "clothing",
      "field_path": "garments.hoodie",
      "claim": "hoodie style and colors",
      "value": "black hoodie with red emblem and shoulder spikes",
      "supporting_observation_ids": [
        "obs_clothing_hoodie_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_bag_001",
      "module": "clothing",
      "field_path": "accessories.bag",
      "claim": "bag worn on body",
      "value": "dark red satchel bag worn across body",
      "supporting_observation_ids": [
        "obs_clothing_bag_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_pose_001",
      "module": "creature_anatomy",
      "field_path": "pose",
      "claim": "human standing posture",
      "value": "standing with left arm raised, right arm lowered",
      "supporting_observation_ids": [
        "obs_posture_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_gesture_left_001",
      "module": "human_appearance",
      "field_path": "gestures.left_hand",
      "claim": "left hand gesture",
      "value": "open with fingers curled slightly inward",
      "supporting_observation_ids": [
        "obs_hand_left_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_gesture_right_001",
      "module": "human_appearance",
      "field_path": "gestures.right_hand",
      "claim": "right hand gesture",
      "value": "open with fingers relaxed downward",
      "supporting_observation_ids": [
        "obs_hand_right_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "setting",
      "claim": "environment setting",
      "value": "green grassy hill with cloudy sky",
      "supporting_observation_ids": [
        "obs_background_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_name_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text",
      "value": "グラジオの決戦 (Gladion's Final Battle in Japanese)",
      "supporting_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_supporter_001",
      "module": "card_ui_and_print_markers",
      "field_path": "other_print_marker",
      "claim": "supporter text red top left",
      "value": "supporter",
      "supporting_observation_ids": [
        "obs_card_ui_subtitle_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_trainer_001",
      "module": "card_ui_and_print_markers",
      "field_path": "other_print_marker",
      "claim": "trainer category text",
      "value": "トレーナーズ (Trainers in Japanese)",
      "supporting_observation_ids": [
        "obs_card_ui_trainer_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_text_japanese_001",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text",
      "claim": "Japanese descriptive text",
      "value": "multiple lines of Japanese game rules / card details text",
      "supporting_observation_ids": [
        "obs_card_ui_text_japanese_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_illustrator_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator credit",
      "value": "Illus. akagi",
      "supporting_observation_ids": [
        "obs_card_ui_illustrator_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_set_code_001",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "set code and number",
      "value": "J M5",
      "supporting_observation_ids": [
        "obs_card_ui_set_code_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_card_number_001",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "card number and rarity",
      "value": "109/081 SR",
      "supporting_observation_ids": [
        "obs_card_ui_card_number_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "human male figure",
      "identity_confidence": 0.99,
      "anatomy": [
        "face",
        "left ear",
        "left eye",
        "left hand",
        "right hand",
        "torso"
      ],
      "physical_features": [
        "green left eye",
        "three pink ear piercings"
      ],
      "pose": [
        "standing"
      ],
      "orientation": "forward",
      "action_state": [
        "left arm raised",
        "right arm down"
      ],
      "facial_evidence": {
        "eyes": "open",
        "mouth": "neutral",
        "eyebrows": "neutral",
        "face_position": "frontal",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [
        "black hoodie with emblem",
        "dark red bag"
      ],
      "colors": [
        "black",
        "blond",
        "green",
        "pink",
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
      "obs_clothing_bag_001",
      "obs_clothing_hoodie_001",
      "obs_ear_001",
      "obs_eye_left_001",
      "obs_hair_001",
      "obs_hand_left_001",
      "obs_hand_right_001",
      "obs_posture_001",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_background_001"
    ]
  },
  "environment": {
    "setting": [
      "outdoor grassy hill"
    ],
    "indoor_outdoor": "outdoor",
    "sky": [
      "cloudy sky"
    ],
    "ground": [
      "green grassy hill"
    ],
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
      "observation_id": "obs_clothing_hoodie_001",
      "label": "black hoodie with red emblem and shoulder spikes",
      "normalized_label": "hoodie",
      "object_type": "clothing",
      "colors": [
        "black",
        "red"
      ],
      "material_appearance": [],
      "location": "torso",
      "count_reference": "",
      "confidence": 0.99
    },
    {
      "observation_id": "obs_clothing_bag_001",
      "label": "dark red satchel bag worn across body",
      "normalized_label": "bag",
      "object_type": "accessory",
      "colors": [
        "red"
      ],
      "material_appearance": [],
      "location": "waist",
      "count_reference": "",
      "confidence": 0.95
    }
  ],
  "relationships": [
    {
      "relationship_id": "rel_001",
      "source_observation_id": "obs_subject_001",
      "target_observation_id": "obs_clothing_bag_001",
      "relationship": "wearing",
      "evidence_strength": "strong"
    }
  ],
  "visual_design": {
    "palette": [
      "black",
      "blond",
      "blue",
      "gray",
      "green",
      "red",
      "white"
    ],
    "lighting": [
      "soft diffuse lighting"
    ],
    "shadows": [
      "medium soft shadows"
    ],
    "highlights": [
      "highlight on hair"
    ],
    "composition": [
      "central figure front and center",
      "arm gesture"
    ],
    "camera_angle": "front view",
    "framing": "medium close-up of figure",
    "cropping": [],
    "depth": "medium depth with clear background",
    "motion_cues": [
      "arm movement suggested"
    ],
    "motifs": [
      "angular sharp hair style",
      "stylized clouds"
    ],
    "repeated_shapes": [
      "angular shapes in hair and hoodie"
    ],
    "style_cues": [
      "sharp outlines",
      "soft shading"
    ],
    "supporting_observation_ids": [
      "obs_background_001",
      "obs_clothing_hoodie_001",
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
    "relationships_review": "observed",
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
        "fact_ear_001",
        "fact_eye_001",
        "fact_gesture_left_001",
        "fact_gesture_right_001",
        "fact_hair_001"
      ],
      "visible_body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "face",
          "visibility": "visible",
          "details": [
            "green left eye",
            "neutral eyebrows",
            "neutral mouth",
            "open eyes"
          ],
          "supporting_observation_ids": [
            "obs_eye_left_001"
          ],
          "confidence": 0.98
        }
      ],
      "facial_evidence": [
        {
          "subject_observation_id": "obs_subject_001",
          "face_position": "frontal",
          "eyes": "open",
          "mouth": "neutral",
          "eyebrows": "neutral",
          "other_visible_evidence": [],
          "supporting_observation_ids": [
            "obs_eye_left_001"
          ],
          "confidence": 0.96
        }
      ],
      "hair": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "blond hair",
          "details": [
            "angular sharp style"
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
          "label": "left hand gesture",
          "details": [
            "open with fingers curled inward"
          ],
          "supporting_observation_ids": [
            "obs_hand_left_001"
          ],
          "confidence": 0.97
        },
        {
          "subject_observation_id": "obs_subject_001",
          "label": "right hand gesture",
          "details": [
            "open with fingers relaxed downward"
          ],
          "supporting_observation_ids": [
            "obs_hand_right_001"
          ],
          "confidence": 0.97
        }
      ],
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
            "standing"
          ],
          "orientation": "forward",
          "action_state": [
            "left arm raised",
            "right arm down"
          ],
          "supporting_observation_ids": [
            "obs_posture_001"
          ],
          "confidence": 0.98
        }
      ],
      "effects": []
    },
    "clothing": {
      "fact_ids": [
        "fact_clothing_bag_001",
        "fact_clothing_hoodie_001"
      ],
      "garments": [
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "torso",
          "garment": "black hoodie with red emblem and shoulder spikes",
          "neckline_type": "hooded high collar",
          "sleeve_type": "long sleeves",
          "colors": [
            "black",
            "red"
          ],
          "visible_details": [
            "shoulder spikes"
          ],
          "supporting_observation_ids": [
            "obs_clothing_hoodie_001"
          ],
          "confidence": 0.99
        }
      ],
      "accessories": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "dark red satchel bag",
          "details": [
            "worn across body"
          ],
          "supporting_observation_ids": [
            "obs_clothing_bag_001"
          ],
          "confidence": 0.95
        }
      ]
    },
    "objects_and_props": {
      "fact_ids": [],
      "object_observation_ids": [
        "obs_clothing_bag_001",
        "obs_clothing_hoodie_001"
      ]
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
        "fact_card_ui_card_number_001",
        "fact_card_ui_illustrator_001",
        "fact_card_ui_name_001",
        "fact_card_ui_set_code_001",
        "fact_card_ui_supporter_001",
        "fact_card_ui_text_japanese_001",
        "fact_card_ui_trainer_001"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_card_ui_card_number_001"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_set_code_001"
      ],
      "rarity_mark_observation_ids": [
        "obs_card_ui_card_number_001"
      ],
      "copyright_line_observation_ids": [],
      "bottom_line_text_observation_ids": [
        "obs_card_ui_text_japanese_001"
      ],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_card_ui_illustrator_001"
      ],
      "error_marker_observation_ids": [],
      "other_print_marker_observation_ids": [
        "obs_card_ui_subtitle_001",
        "obs_card_ui_trainer_001"
      ]
    },
    "counts": {
      "fact_ids": [],
      "count_ids": []
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
        "human male blond hair",
        "black hoodie with red emblem",
        "green eyes",
        "dark red bag worn across body"
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
      "review_status": "likely_complete",
      "omission_risk": "low",
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
      "review_status": "complete",
      "omission_risk": "none",
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
      "semantic_fact_id": "sf1",
      "category": "state",
      "label": "standing",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_posture_001"
      ],
      "evidence": {
        "mouth": [
          "neutral"
        ],
        "eyes": [
          "open"
        ],
        "eyebrows": [
          "neutral"
        ],
        "facial_features": [],
        "body_language": [
          "left arm raised",
          "right arm down"
        ],
        "body_position": [
          "standing"
        ],
        "motion_state": [],
        "environment": [],
        "objects": [
          "obs clothing bag 001",
          "obs clothing hoodie 001"
        ],
        "relationships": [
          "rel 001"
        ],
        "other": []
      },
      "confidence": 0.98,
      "uncertainty": "none"
    }
  ],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "human male blond hair",
      "supporting_observation_ids": [
        "obs_hair_001"
      ]
    },
    {
      "term": "black hoodie with red emblem",
      "supporting_observation_ids": [
        "obs_clothing_hoodie_001"
      ]
    },
    {
      "term": "green eyes",
      "supporting_observation_ids": [
        "obs_eye_left_001"
      ]
    },
    {
      "term": "dark red bag worn across body",
      "supporting_observation_ids": [
        "obs_clothing_bag_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "forward orientation",
        "source_observation_ids": [
          "obs_posture_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "left orientation",
        "source_observation_ids": [
          "obs_hand_left_001"
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
        "confidence": 0.95
      },
      {
        "concept": "standing",
        "source_observation_ids": [
          "obs_posture_001",
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

### GV-PK-JPN-M5-117 - Gwynn

- Branch: `trainer`
- Review status: `needs_review`
- Description confidence: `0.97`
- Attribute confidence: `0.95`
- Cost USD: `0.0100544`
- Artwork observations: `8`
- Card UI / print-marker observations: `7`
- Card UI module evidence references: `8`
- Derived digest: Fact digest. Scene subjects: female human character. Visible observations: female human character, long purple hair with bangs, purple hair with large curled ram-like horns, female face with large purple eyes, blue garment with high collar yellow cuff detail, long sleeve, left hand extended open palm, sparkling background orange yellow purple hues. Semantic facts: left hand extended forward.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| female human character | female human character | scene_subject | foreground | high | 0.99 |
| long purple hair with bangs | long purple hair with bangs | hair | foreground | medium | 0.98 |
| purple hair with large curled ram-like horns | purple hair with large curled ram-like horns | hair | foreground | high | 0.99 |
| female face with large purple eyes and neutral expression | female face with large purple eyes | human_face | foreground | high | 0.99 |
| blue garment with high collar and yellow cuff detail | blue garment with high collar yellow cuff detail | clothing | foreground | high | 0.98 |
| long sleeve | long sleeve | clothing | foreground | medium | 0.98 |
| left hand extended forward with open palm | left hand extended open palm | body_part | foreground | medium | 0.97 |
| sparkling background with orange, yellow, and purple hues | sparkling background orange yellow purple hues | background | background | medium | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text: ムク | card_ui_text | top_left | visible | 0.99 |
| supporter label text: サポート | card_ui_text | top_left | visible | 0.99 |
| trainers label text: トレーナーズ | card_ui_text | top_right | visible | 0.99 |
| set code text: 117/081 SAR | card_ui_text | bottom_left | visible | 0.99 |
| illustrator text: Naoki Saito | card_ui_text | bottom_left_under_set | visible | 0.98 |
| copyright text: 2026 Pokémon/Nintendo/Creatures/GAME FREAK. | copyright_text | bottom | visible | 0.99 |
| card description text in Japanese under artwork | card_ui_text | under_artwork | visible | 0.97 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | identity | obs_subject_001 | 0.99 |
| fact_hair_001 | human_appearance | color and style | obs_hair_001, obs_hair_002 | 0.98 |
| fact_human_face_001 | human_appearance | facial features | obs_human_face_001 | 0.99 |
| fact_clothing_001 | clothing | upper body clothing | obs_clothing_001, obs_clothing_002 | 0.98 |
| fact_human_appearance_arms_001 | human_appearance | left arm extended forward | obs_hand_001 | 0.97 |
| fact_environment_001 | environment | sparkling background with orange, yellow, and purple hues | obs_background_001 | 0.95 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_and_print_markers_name_001 | card name text | obs_card_ui_text_name_001 | 0.99 |
| fact_card_ui_and_print_markers_supporter_001 | supporter label text | obs_card_ui_text_supporter_001 | 0.99 |
| fact_card_ui_and_print_markers_trainers_001 | trainers label text | obs_card_ui_text_trainers_001 | 0.99 |
| fact_card_ui_and_print_markers_set_code_001 | set code text | obs_card_ui_text_set_code_001 | 0.99 |
| fact_card_ui_and_print_markers_illustrator_001 | illustrator text | obs_card_ui_text_illustrator_001 | 0.98 |
| fact_card_ui_and_print_markers_copyright_001 | copyright text | obs_card_ui_text_copyright_001 | 0.99 |
| fact_card_ui_and_print_markers_description_001 | card description text | obs_card_ui_text_description_001 | 0.97 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_and_print_markers_copyright_001",
    "fact_card_ui_and_print_markers_description_001",
    "fact_card_ui_and_print_markers_illustrator_001",
    "fact_card_ui_and_print_markers_name_001",
    "fact_card_ui_and_print_markers_set_code_001",
    "fact_card_ui_and_print_markers_supporter_001",
    "fact_card_ui_and_print_markers_trainers_001"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_text_name_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_card_ui_text_set_code_001"
  ],
  "set_symbol_observation_ids": [],
  "rarity_mark_observation_ids": [
    "obs_card_ui_text_set_code_001"
  ],
  "copyright_line_observation_ids": [
    "obs_card_ui_text_copyright_001"
  ],
  "bottom_line_text_observation_ids": [
    "obs_card_ui_text_description_001"
  ],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_card_ui_text_illustrator_001"
  ],
  "error_marker_observation_ids": [],
  "other_print_marker_observation_ids": [
    "obs_card_ui_text_supporter_001",
    "obs_card_ui_text_trainers_001"
  ]
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
| composition | none_visible | none | not_applicable |  |
| color_and_light | likely_complete | low | high |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | complete | low | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | likely_complete | low | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| sem_fact_001 | action | left hand extended forward | obs_subject_001 | obs_hand_001 | neutral mouth large purple eyes neutral eyebrows face fully visible left hand extended forward open palm forward orientation standing gesture | 0.97 |

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
| long purple hair | obs_hair_001 |
| curled ram-like horns | obs_hair_002 |
| blue garment | obs_clothing_001 |
| extended left hand | obs_hand_001 |
| sparkling background | obs_background_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| forward orientation | obs_subject_001 | deterministic_rule | 0.99 |
| left hand extended forward | obs_hand_001 | deterministic_rule | 0.97 |
| reaching | obs_subject_001 | deterministic_rule | 0.99 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: female human character. Visible observations: female human character, long purple hair with bangs, purple hair with large curled ram-like horns, female face with large purple eyes, blue garment with high collar yellow cuff detail, long sleeve, left hand extended open palm, sparkling background orange yellow purple hues. Semantic facts: left hand extended forward.
- Quality flags: `potential_pose_or_action_without_visible_support`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "female human character",
      "normalized_label": "female human character",
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
      "label": "long purple hair with bangs",
      "normalized_label": "long purple hair with bangs",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hair_002",
      "kind": "hair",
      "label": "purple hair with large curled ram-like horns",
      "normalized_label": "purple hair with large curled ram-like horns",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_human_face_001",
      "kind": "human_face",
      "label": "female face with large purple eyes and neutral expression",
      "normalized_label": "female face with large purple eyes",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_001",
      "kind": "clothing",
      "label": "blue garment with high collar and yellow cuff detail",
      "normalized_label": "blue garment with high collar yellow cuff detail",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_002",
      "kind": "clothing",
      "label": "long sleeve",
      "normalized_label": "long sleeve",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hand_001",
      "kind": "body_part",
      "label": "left hand extended forward with open palm",
      "normalized_label": "left hand extended open palm",
      "scene_layer": "foreground",
      "frame_position": "center_lower",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_background_001",
      "kind": "background",
      "label": "sparkling background with orange, yellow, and purple hues",
      "normalized_label": "sparkling background orange yellow purple hues",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_name_001",
      "kind": "card_ui_text",
      "label": "card name text: ムク",
      "normalized_label": "card name text muk",
      "scene_layer": "card_ui",
      "frame_position": "top_left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_supporter_001",
      "kind": "card_ui_text",
      "label": "supporter label text: サポート",
      "normalized_label": "supporter label text support",
      "scene_layer": "card_ui",
      "frame_position": "top_left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_trainers_001",
      "kind": "card_ui_text",
      "label": "trainers label text: トレーナーズ",
      "normalized_label": "trainers label text trainers",
      "scene_layer": "card_ui",
      "frame_position": "top_right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_set_code_001",
      "kind": "card_ui_text",
      "label": "set code text: 117/081 SAR",
      "normalized_label": "set code text 117/081 SAR",
      "scene_layer": "card_ui",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_illustrator_001",
      "kind": "card_ui_text",
      "label": "illustrator text: Naoki Saito",
      "normalized_label": "illustrator text Naoki Saito",
      "scene_layer": "card_ui",
      "frame_position": "bottom_left_under_set",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_copyright_001",
      "kind": "copyright_text",
      "label": "copyright text: 2026 Pokémon/Nintendo/Creatures/GAME FREAK.",
      "normalized_label": "copyright text 2026 pokemon nintendo creatures game freak",
      "scene_layer": "card_ui",
      "frame_position": "bottom",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_description_001",
      "kind": "card_ui_text",
      "label": "card description text in Japanese under artwork",
      "normalized_label": "card description text japanese",
      "scene_layer": "card_ui",
      "frame_position": "under_artwork",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_001",
      "module": "subjects",
      "field_path": "scene_subject.identity",
      "claim": "identity",
      "value": "female human character",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_hair_001",
      "module": "human_appearance",
      "field_path": "hair",
      "claim": "color and style",
      "value": "long purple hair with bangs and large curled ram-like horns",
      "supporting_observation_ids": [
        "obs_hair_001",
        "obs_hair_002"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_human_face_001",
      "module": "human_appearance",
      "field_path": "face",
      "claim": "facial features",
      "value": "female face with large purple eyes and",
      "supporting_observation_ids": [
        "obs_human_face_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_001",
      "module": "clothing",
      "field_path": "garments",
      "claim": "upper body clothing",
      "value": "blue garment with high collar and yellow cuff detail with long sleeves",
      "supporting_observation_ids": [
        "obs_clothing_001",
        "obs_clothing_002"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_human_appearance_arms_001",
      "module": "human_appearance",
      "field_path": "arms",
      "claim": "left arm extended forward",
      "value": "left hand extended forward with open palm",
      "supporting_observation_ids": [
        "obs_hand_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "background",
      "claim": "sparkling background with orange, yellow, and purple hues",
      "value": "sparkling background orange yellow purple hues",
      "supporting_observation_ids": [
        "obs_background_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_name_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text",
      "value": "ムク",
      "supporting_observation_ids": [
        "obs_card_ui_text_name_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_supporter_001",
      "module": "card_ui_and_print_markers",
      "field_path": "other_print_marker",
      "claim": "supporter label text",
      "value": "サポート",
      "supporting_observation_ids": [
        "obs_card_ui_text_supporter_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_trainers_001",
      "module": "card_ui_and_print_markers",
      "field_path": "other_print_marker",
      "claim": "trainers label text",
      "value": "トレーナーズ",
      "supporting_observation_ids": [
        "obs_card_ui_text_trainers_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_set_code_001",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "set code text",
      "value": "117/081 SAR",
      "supporting_observation_ids": [
        "obs_card_ui_text_set_code_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_illustrator_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator text",
      "value": "Naoki Saito",
      "supporting_observation_ids": [
        "obs_card_ui_text_illustrator_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_copyright_001",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line",
      "claim": "copyright text",
      "value": "2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "supporting_observation_ids": [
        "obs_card_ui_text_copyright_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_description_001",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text",
      "claim": "card description text",
      "value": "Japanese text under artwork",
      "supporting_observation_ids": [
        "obs_card_ui_text_description_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "female human character",
      "identity_confidence": 0.99,
      "anatomy": [
        "arms",
        "face",
        "hands"
      ],
      "physical_features": [
        "large purple eyes",
        "long purple hair with bangs and large curled ram-like horns",
        "neutral facial expression"
      ],
      "pose": [
        "reaching"
      ],
      "orientation": "forward",
      "action_state": [
        "gesturing with left hand",
        "standing"
      ],
      "facial_evidence": {
        "eyes": "large purple eyes",
        "mouth": "neutral mouth",
        "eyebrows": "neutral eyebrows",
        "face_position": "centered",
        "other_visible_evidence": [
          "face fully visible"
        ]
      },
      "clothing_or_accessories": [
        "blue garment with high collar and yellow cuff detail",
        "long sleeves"
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
      "obs_clothing_001",
      "obs_clothing_002",
      "obs_hair_001",
      "obs_hair_002",
      "obs_hand_001",
      "obs_human_face_001",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_background_001"
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
      "soft diffuse light",
      "sparkling highlights"
    ],
    "shadows": [
      "soft shadows on face and arm"
    ],
    "highlights": [
      "white sparkles in background"
    ],
    "composition": [
      "centered human figure",
      "hand extended towards viewer"
    ],
    "camera_angle": "frontal eye-level",
    "framing": "tight crop around torso and head",
    "cropping": [
      "lower body cropped out"
    ],
    "depth": "shallow depth of field",
    "motion_cues": [
      "gesture of left arm"
    ],
    "motifs": [
      "curled horns motif",
      "sparkling light motif"
    ],
    "repeated_shapes": [
      "large curled horn shapes"
    ],
    "style_cues": [
      "smooth shading"
    ],
    "supporting_observation_ids": [
      "obs_background_001",
      "obs_hair_002",
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
        "fact_human_appearance_arms_001",
        "fact_human_face_001"
      ],
      "visible_body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "face",
          "visibility": "visible",
          "details": [
            "large purple eyes",
            "neutral eyebrows",
            "neutral mouth"
          ],
          "supporting_observation_ids": [
            "obs_human_face_001"
          ],
          "confidence": 0.99
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "arms",
          "visibility": "visible",
          "details": [
            "left arm extended forward"
          ],
          "supporting_observation_ids": [
            "obs_hand_001"
          ],
          "confidence": 0.97
        }
      ],
      "facial_evidence": [
        {
          "subject_observation_id": "obs_subject_001",
          "face_position": "centered",
          "eyes": "large purple eyes",
          "mouth": "neutral mouth",
          "eyebrows": "neutral eyebrows",
          "other_visible_evidence": [
            "face fully visible"
          ],
          "supporting_observation_ids": [
            "obs_human_face_001"
          ],
          "confidence": 0.99
        }
      ],
      "hair": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "long purple hair with bangs and large curled ram-like horns",
          "details": [
            "large curled ram-like horns",
            "purple hair"
          ],
          "supporting_observation_ids": [
            "obs_hair_001",
            "obs_hair_002"
          ],
          "confidence": 0.98
        }
      ],
      "gestures": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "left hand extended forward with open palm",
          "details": [
            "extended left arm",
            "open palm"
          ],
          "supporting_observation_ids": [
            "obs_hand_001"
          ],
          "confidence": 0.97
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
        "fact_clothing_001"
      ],
      "garments": [
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "upper body",
          "garment": "blue garment with high collar and yellow cuff detail",
          "neckline_type": "high collar",
          "sleeve_type": "long sleeve",
          "colors": [
            "blue",
            "yellow"
          ],
          "visible_details": [
            "yellow cuff detail"
          ],
          "supporting_observation_ids": [
            "obs_clothing_001",
            "obs_clothing_002"
          ],
          "confidence": 0.98
        }
      ],
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
      "fact_ids": [],
      "observation_ids": [
        "obs_background_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": []
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_ui_and_print_markers_copyright_001",
        "fact_card_ui_and_print_markers_description_001",
        "fact_card_ui_and_print_markers_illustrator_001",
        "fact_card_ui_and_print_markers_name_001",
        "fact_card_ui_and_print_markers_set_code_001",
        "fact_card_ui_and_print_markers_supporter_001",
        "fact_card_ui_and_print_markers_trainers_001"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_text_name_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_card_ui_text_set_code_001"
      ],
      "set_symbol_observation_ids": [],
      "rarity_mark_observation_ids": [
        "obs_card_ui_text_set_code_001"
      ],
      "copyright_line_observation_ids": [
        "obs_card_ui_text_copyright_001"
      ],
      "bottom_line_text_observation_ids": [
        "obs_card_ui_text_description_001"
      ],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_card_ui_text_illustrator_001"
      ],
      "error_marker_observation_ids": [],
      "other_print_marker_observation_ids": [
        "obs_card_ui_text_supporter_001",
        "obs_card_ui_text_trainers_001"
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
        "long purple hair",
        "curled ram-like horns",
        "blue garment",
        "extended left hand",
        "sparkling background"
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
      "review_status": "likely_complete",
      "omission_risk": "low",
      "evidence_quality": "high",
      "abstentions": []
    }
  ],
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "sem_fact_001",
      "category": "action",
      "label": "left hand extended forward",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_hand_001"
      ],
      "evidence": {
        "mouth": [
          "neutral mouth"
        ],
        "eyes": [
          "large purple eyes"
        ],
        "eyebrows": [
          "neutral eyebrows"
        ],
        "facial_features": [
          "face fully visible"
        ],
        "body_language": [
          "left hand extended forward",
          "open palm"
        ],
        "body_position": [
          "forward orientation",
          "standing"
        ],
        "motion_state": [
          "gesture"
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
      "term": "long purple hair",
      "supporting_observation_ids": [
        "obs_hair_001"
      ]
    },
    {
      "term": "curled ram-like horns",
      "supporting_observation_ids": [
        "obs_hair_002"
      ]
    },
    {
      "term": "blue garment",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ]
    },
    {
      "term": "extended left hand",
      "supporting_observation_ids": [
        "obs_hand_001"
      ]
    },
    {
      "term": "sparkling background",
      "supporting_observation_ids": [
        "obs_background_001"
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
        "concept": "left hand extended forward",
        "source_observation_ids": [
          "obs_hand_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
      },
      {
        "concept": "reaching",
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

### GV-PK-JPN-M5-116 - Gladion's Final Battle

- Branch: `trainer`
- Review status: `needs_review`
- Description confidence: `0.95`
- Attribute confidence: `0.95`
- Cost USD: `0.0109392`
- Artwork observations: `13`
- Card UI / print-marker observations: `7`
- Card UI module evidence references: `7`
- Derived digest: Fact digest. Scene subjects: male human trainer. Visible observations: male human trainer standing, yellow blond hair, face visible, yellow eyes, mouth closed, black jacket with long sleeves, red waist bag, standing with right hand OK gesture. Semantic facts: standing.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| male human trainer with standing pose | male human trainer standing | scene_subject | foreground | high | 0.99 |
| yellow blond hair with side bangs | yellow blond hair | hair | foreground | high | 0.99 |
| face visible in side profile | face visible | human_appearance | foreground | high | 0.99 |
| yellow eyes looking sideways | yellow eyes | human_appearance | foreground | high | 0.98 |
| mouth closed, neutral expression | mouth closed | human_appearance | foreground | medium | 0.95 |
| black jacket with high spike collar and long sleeves | black jacket with long sleeves | clothing | foreground | high | 0.99 |
| red bag worn on waist | red waist bag | clothing | foreground | high | 0.99 |
| standing pose with right hand raised near face making an OK gesture | standing with right hand OK gesture | creature_anatomy | foreground | high | 0.98 |
| left hand resting on lower chest | left hand on lower chest | creature_anatomy | foreground | high | 0.97 |
| mountainous background with blue sky and bright sunlight | mountainous background blue sky sunlight | environment | background | medium | 0.95 |
| white clouds scattered in blue sky | white clouds in blue sky | environment | background | medium | 0.95 |
| green mountain vegetation | green mountain vegetation | environment | background | medium | 0.95 |
| multiple pink and purple light rays crossing | light rays pink purple | visual_effects | foreground | medium | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card title text in Japanese at top left | card_ui_text | top_left | visible | 0.95 |
| card category text at top right in Japanese | card_ui_text | top_right | visible | 0.95 |
| Japanese effect text block centered near bottom | card_ui_text | center_bottom | visible | 0.95 |
| illustrator credit text 'Illus.DOM' on lower left | card_ui_text | bottom_left | visible | 0.95 |
| set symbol in bottom left corner near illustrator text | card_ui_text | bottom_left | visible | 0.95 |
| card number '116/081' and rarity 'SAR' near bottom left | card_ui_text | bottom_left | visible | 0.95 |
| copyright text with year 2026 below bottom edge | card_ui_text | bottom_center | visible | 0.9 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | subjects | scene subject identity | obs_subject_001 | 0.99 |
| fact_002 | human_appearance | hair color and style | obs_hair_001 | 0.99 |
| fact_003 | human_appearance | face visible as side profile | obs_body_region_face_001 | 0.99 |
| fact_004 | human_appearance | eye color | obs_eye_001 | 0.98 |
| fact_005 | human_appearance | mouth state | obs_mouth_001 | 0.95 |
| fact_006 | clothing | outerwear | obs_clothing_001 | 0.99 |
| fact_007 | clothing | waist accessory | obs_clothing_002 | 0.99 |
| fact_008 | creature_anatomy | pose with right hand making OK gesture near face | obs_pose_001 | 0.98 |
| fact_009 | creature_anatomy | pose with left hand resting on lower chest | obs_pose_002 | 0.97 |
| fact_010 | environment | environmental setting | obs_environment_001, obs_environment_002, obs_environment_003 | 0.95 |
| fact_011 | visual_effects | pink and purple light rays crossing scene | obs_light_rays_001 | 0.95 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_012 | card title text in Japanese | obs_card_ui_001 | 0.95 |
| fact_013 | card category text in Japanese | obs_card_ui_002 | 0.95 |
| fact_014 | card effect text block in Japanese | obs_card_ui_003 | 0.95 |
| fact_015 | illustrator credit text | obs_card_ui_004 | 0.95 |
| fact_016 | set symbol visible | obs_card_ui_005 | 0.95 |
| fact_017 | card number and rarity visible | obs_card_ui_006 | 0.95 |
| fact_018 | copyright text visible | obs_card_ui_007 | 0.9 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_012",
    "fact_013",
    "fact_014",
    "fact_015",
    "fact_016",
    "fact_017",
    "fact_018"
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
    "obs_card_ui_003"
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
| subjects | complete | none | high |  |
| human_appearance | complete | none | high |  |
| creature_anatomy | complete | none | high |  |
| clothing | complete | none | high |  |
| objects_and_props | none_visible | none | not_applicable |  |
| environment | complete | none | medium |  |
| composition | complete | none | high |  |
| color_and_light | complete | none | medium |  |
| visual_effects | complete | none | medium |  |
| card_ui_and_print_markers | complete | low | medium |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | not_applicable | none | not_applicable |  |
| fact_grounded_search_terms | complete | low | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| sem_001 | action | standing | obs_subject_001 | obs_pose_001, obs_pose_002 | face visible left hand resting on chest right hand making OK gesture standing | 0.97 |

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
| yellow blond hair | obs_hair_001 |
| black jacket | obs_clothing_001 |
| red waist bag | obs_clothing_002 |
| mountain environment | obs_environment_001 |
| blue sky | obs_environment_002 |
| light rays | obs_light_rays_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| cloud | obs_environment_002 | deterministic_rule | 0.95 |
| left hand on lower chest | obs_pose_001, obs_pose_002, obs_subject_001 | deterministic_rule | 0.99 |
| left orientation | obs_pose_002 | deterministic_rule | 0.97 |
| right hand making OK gesture near face | obs_subject_001 | deterministic_rule | 0.99 |
| right hand OK gesture near face | obs_pose_001, obs_pose_002 | deterministic_rule | 0.97 |
| right orientation | obs_pose_001 | deterministic_rule | 0.98 |
| side profile orientation | obs_pose_001, obs_pose_002, obs_subject_001 | deterministic_rule | 0.99 |
| sky | obs_environment_001, obs_environment_002 | deterministic_rule | 0.95 |
| standing | obs_pose_001, obs_pose_002, obs_subject_001 | deterministic_rule | 0.99 |
| terrain | obs_environment_003 | deterministic_rule | 0.95 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: male human trainer. Visible observations: male human trainer standing, yellow blond hair, face visible, yellow eyes, mouth closed, black jacket with long sleeves, red waist bag, standing with right hand OK gesture. Semantic facts: standing.
- Quality flags: `potential_pose_or_action_without_visible_support`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "male human trainer with standing pose",
      "normalized_label": "male human trainer standing",
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
      "label": "yellow blond hair with side bangs",
      "normalized_label": "yellow blond hair",
      "scene_layer": "foreground",
      "frame_position": "head",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_region_face_001",
      "kind": "human_appearance",
      "label": "face visible in side profile",
      "normalized_label": "face visible",
      "scene_layer": "foreground",
      "frame_position": "head",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_eye_001",
      "kind": "human_appearance",
      "label": "yellow eyes looking sideways",
      "normalized_label": "yellow eyes",
      "scene_layer": "foreground",
      "frame_position": "face",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_mouth_001",
      "kind": "human_appearance",
      "label": "mouth closed, neutral expression",
      "normalized_label": "mouth closed",
      "scene_layer": "foreground",
      "frame_position": "face",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_clothing_001",
      "kind": "clothing",
      "label": "black jacket with high spike collar and long sleeves",
      "normalized_label": "black jacket with long sleeves",
      "scene_layer": "foreground",
      "frame_position": "torso",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_002",
      "kind": "clothing",
      "label": "red bag worn on waist",
      "normalized_label": "red waist bag",
      "scene_layer": "foreground",
      "frame_position": "waist",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_001",
      "kind": "creature_anatomy",
      "label": "standing pose with right hand raised near face making an OK gesture",
      "normalized_label": "standing with right hand OK gesture",
      "scene_layer": "foreground",
      "frame_position": "body",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_002",
      "kind": "creature_anatomy",
      "label": "left hand resting on lower chest",
      "normalized_label": "left hand on lower chest",
      "scene_layer": "foreground",
      "frame_position": "body",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "mountainous background with blue sky and bright sunlight",
      "normalized_label": "mountainous background blue sky sunlight",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_environment_002",
      "kind": "environment",
      "label": "white clouds scattered in blue sky",
      "normalized_label": "white clouds in blue sky",
      "scene_layer": "background",
      "frame_position": "upper",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_environment_003",
      "kind": "environment",
      "label": "green mountain vegetation",
      "normalized_label": "green mountain vegetation",
      "scene_layer": "background",
      "frame_position": "lower",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_light_rays_001",
      "kind": "visual_effects",
      "label": "multiple pink and purple light rays crossing",
      "normalized_label": "light rays pink purple",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_card_ui_001",
      "kind": "card_ui_text",
      "label": "card title text in Japanese at top left",
      "normalized_label": "card title Japanese",
      "scene_layer": "user_interface",
      "frame_position": "top_left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_card_ui_002",
      "kind": "card_ui_text",
      "label": "card category text at top right in Japanese",
      "normalized_label": "card category Japanese",
      "scene_layer": "user_interface",
      "frame_position": "top_right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_card_ui_003",
      "kind": "card_ui_text",
      "label": "Japanese effect text block centered near bottom",
      "normalized_label": "card effect text Japanese",
      "scene_layer": "user_interface",
      "frame_position": "center_bottom",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_card_ui_004",
      "kind": "card_ui_text",
      "label": "illustrator credit text 'Illus.DOM' on lower left",
      "normalized_label": "illustrator text",
      "scene_layer": "user_interface",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_card_ui_005",
      "kind": "card_ui_text",
      "label": "set symbol in bottom left corner near illustrator text",
      "normalized_label": "set symbol",
      "scene_layer": "user_interface",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_card_ui_006",
      "kind": "card_ui_text",
      "label": "card number '116/081' and rarity 'SAR' near bottom left",
      "normalized_label": "card number and rarity",
      "scene_layer": "user_interface",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_card_ui_007",
      "kind": "card_ui_text",
      "label": "copyright text with year 2026 below bottom edge",
      "normalized_label": "copyright text",
      "scene_layer": "user_interface",
      "frame_position": "bottom_center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "medium"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_001",
      "module": "subjects",
      "field_path": "[0].identity",
      "claim": "scene subject identity",
      "value": "male human trainer",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_002",
      "module": "human_appearance",
      "field_path": "[0].hair",
      "claim": "hair color and style",
      "value": "yellow blond hair with side bangs",
      "supporting_observation_ids": [
        "obs_hair_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_003",
      "module": "human_appearance",
      "field_path": "visible_body_regions.face",
      "claim": "face visible as side profile",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_body_region_face_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "human_appearance",
      "field_path": "facial_evidence.eyes",
      "claim": "eye color",
      "value": "yellow eyes",
      "supporting_observation_ids": [
        "obs_eye_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_005",
      "module": "human_appearance",
      "field_path": "facial_evidence.mouth",
      "claim": "mouth state",
      "value": "closed mouth with",
      "supporting_observation_ids": [
        "obs_mouth_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_006",
      "module": "clothing",
      "field_path": "garments",
      "claim": "outerwear",
      "value": "black jacket with high collar and long sleeves",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_007",
      "module": "clothing",
      "field_path": "accessories",
      "claim": "waist accessory",
      "value": "red bag worn on waist",
      "supporting_observation_ids": [
        "obs_clothing_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_008",
      "module": "creature_anatomy",
      "field_path": "pose",
      "claim": "pose with right hand making OK gesture near face",
      "value": "standing with right hand OK gesture near face",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_009",
      "module": "creature_anatomy",
      "field_path": "pose",
      "claim": "pose with left hand resting on lower chest",
      "value": "left hand on lower chest",
      "supporting_observation_ids": [
        "obs_pose_002"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_010",
      "module": "environment",
      "field_path": "setting",
      "claim": "environmental setting",
      "value": "mountainous area with blue sky and sunlight",
      "supporting_observation_ids": [
        "obs_environment_001",
        "obs_environment_002",
        "obs_environment_003"
      ],
      "confidence": 0.95,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_011",
      "module": "visual_effects",
      "field_path": "effects",
      "claim": "pink and purple light rays crossing scene",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_light_rays_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_012",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card title text in Japanese",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_card_ui_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_013",
      "module": "card_ui_and_print_markers",
      "field_path": "card_category_text",
      "claim": "card category text in Japanese",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_card_ui_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_014",
      "module": "card_ui_and_print_markers",
      "field_path": "effect_text",
      "claim": "card effect text block in Japanese",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_card_ui_003"
      ],
      "confidence": 0.95,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_015",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator credit text",
      "value": "Illus.DOM",
      "supporting_observation_ids": [
        "obs_card_ui_004"
      ],
      "confidence": 0.95,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_016",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "set symbol visible",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_card_ui_005"
      ],
      "confidence": 0.95,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_017",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number_and_rarity",
      "claim": "card number and rarity visible",
      "value": "116/081 SAR",
      "supporting_observation_ids": [
        "obs_card_ui_006"
      ],
      "confidence": 0.95,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_018",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line",
      "claim": "copyright text visible",
      "value": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "supporting_observation_ids": [
        "obs_card_ui_007"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "male human trainer",
      "identity_confidence": 0.99,
      "anatomy": [
        "face"
      ],
      "physical_features": [
        "yellow blond hair",
        "yellow eyes"
      ],
      "pose": [
        "left hand on lower chest",
        "right hand making OK gesture near face",
        "standing"
      ],
      "orientation": "side profile",
      "action_state": [],
      "facial_evidence": {
        "eyes": "yellow eyes",
        "mouth": "closed mouth",
        "eyebrows": "not visible",
        "face_position": "side",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [
        "black jacket with high collar and long sleeves",
        "red waist bag"
      ],
      "colors": [
        "black",
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
      "obs_clothing_001",
      "obs_clothing_002",
      "obs_hair_001",
      "obs_light_rays_001",
      "obs_pose_001",
      "obs_pose_002",
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
      "mountainous"
    ],
    "indoor_outdoor": "outdoor",
    "sky": [
      "blue sky",
      "white clouds"
    ],
    "ground": [
      "green mountain vegetation"
    ],
    "terrain": [
      "mountain"
    ],
    "plants": [
      "vegetation"
    ],
    "architecture": [],
    "water": [],
    "weather": [],
    "time_of_day_cues": [
      "bright sunlight",
      "daytime"
    ],
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
      "pink",
      "purple",
      "red",
      "white",
      "yellow"
    ],
    "lighting": [
      "bright sunlight"
    ],
    "shadows": [
      "present"
    ],
    "highlights": [
      "bright highlights on hair and jacket"
    ],
    "composition": [
      "central composition",
      "light rays"
    ],
    "camera_angle": "eye level",
    "framing": "medium close-up framing",
    "cropping": [],
    "depth": "deep with foreground and background",
    "motion_cues": [
      "light rays crossing"
    ],
    "motifs": [
      "radiating light"
    ],
    "repeated_shapes": [
      "light ray shapes"
    ],
    "style_cues": [
      "stylized anime"
    ],
    "supporting_observation_ids": [
      "obs_environment_001",
      "obs_light_rays_001",
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
        "fact_002",
        "fact_003",
        "fact_004",
        "fact_005"
      ],
      "visible_body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "face",
          "visibility": "visible",
          "details": [
            "face visible",
            "side profile"
          ],
          "supporting_observation_ids": [
            "obs_body_region_face_001"
          ],
          "confidence": 0.99
        }
      ],
      "facial_evidence": [
        {
          "subject_observation_id": "obs_subject_001",
          "face_position": "side profile",
          "eyes": "yellow eyes",
          "mouth": "closed mouth",
          "eyebrows": "not visible",
          "other_visible_evidence": [],
          "supporting_observation_ids": [
            "obs_eye_001",
            "obs_mouth_001"
          ],
          "confidence": 0.96
        }
      ],
      "hair": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "yellow blond hair",
          "details": [
            "side bangs"
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
          "label": "right hand OK gesture near face",
          "details": [],
          "supporting_observation_ids": [
            "obs_pose_001"
          ],
          "confidence": 0.98
        }
      ],
      "accessories": []
    },
    "creature_anatomy": {
      "fact_ids": [
        "fact_008",
        "fact_009"
      ],
      "body_regions": [],
      "physical_features": [],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "left hand on lower chest",
            "right hand OK gesture near face",
            "standing"
          ],
          "orientation": "side profile",
          "action_state": [],
          "supporting_observation_ids": [
            "obs_pose_001",
            "obs_pose_002"
          ],
          "confidence": 0.97
        }
      ],
      "effects": []
    },
    "clothing": {
      "fact_ids": [
        "fact_006",
        "fact_007"
      ],
      "garments": [
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "torso",
          "garment": "black jacket",
          "neckline_type": "",
          "sleeve_type": "long sleeves",
          "colors": [
            "black"
          ],
          "visible_details": [
            "high spike collar"
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
          "label": "red bag worn on waist",
          "details": [],
          "supporting_observation_ids": [
            "obs_clothing_002"
          ],
          "confidence": 0.99
        }
      ]
    },
    "objects_and_props": {
      "fact_ids": [],
      "object_observation_ids": []
    },
    "environment": {
      "fact_ids": [
        "fact_010"
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
        "obs_subject_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_environment_001",
        "obs_light_rays_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [
        "fact_011"
      ],
      "observation_ids": [
        "obs_light_rays_001"
      ]
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_012",
        "fact_013",
        "fact_014",
        "fact_015",
        "fact_016",
        "fact_017",
        "fact_018"
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
        "obs_card_ui_003"
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
        "yellow blond hair",
        "black jacket",
        "red waist bag",
        "mountain environment",
        "blue sky",
        "light rays"
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
      "evidence_quality": "medium",
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
      "evidence_quality": "medium",
      "abstentions": []
    },
    {
      "module": "visual_effects",
      "review_status": "complete",
      "omission_risk": "none",
      "evidence_quality": "medium",
      "abstentions": []
    },
    {
      "module": "card_ui_and_print_markers",
      "review_status": "complete",
      "omission_risk": "low",
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
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "sem_001",
      "category": "action",
      "label": "standing",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_pose_001",
        "obs_pose_002"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [],
        "eyebrows": [],
        "facial_features": [
          "face visible"
        ],
        "body_language": [
          "left hand resting on chest",
          "right hand making OK gesture"
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
      "confidence": 0.97,
      "uncertainty": "none"
    }
  ],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "yellow blond hair",
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
      "term": "red waist bag",
      "supporting_observation_ids": [
        "obs_clothing_002"
      ]
    },
    {
      "term": "mountain environment",
      "supporting_observation_ids": [
        "obs_environment_001"
      ]
    },
    {
      "term": "blue sky",
      "supporting_observation_ids": [
        "obs_environment_002"
      ]
    },
    {
      "term": "light rays",
      "supporting_observation_ids": [
        "obs_light_rays_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "cloud",
        "source_observation_ids": [
          "obs_environment_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "left hand on lower chest",
        "source_observation_ids": [
          "obs_pose_001",
          "obs_pose_002",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "left orientation",
        "source_observation_ids": [
          "obs_pose_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
      },
      {
        "concept": "right hand making OK gesture near face",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "right hand OK gesture near face",
        "source_observation_ids": [
          "obs_pose_001",
          "obs_pose_002"
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
        "confidence": 0.98
      },
      {
        "concept": "side profile orientation",
        "source_observation_ids": [
          "obs_pose_001",
          "obs_pose_002",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "sky",
        "source_observation_ids": [
          "obs_environment_001",
          "obs_environment_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "standing",
        "source_observation_ids": [
          "obs_pose_001",
          "obs_pose_002",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "terrain",
        "source_observation_ids": [
          "obs_environment_003"
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
- Description confidence: `0.98`
- Attribute confidence: `0.95`
- Cost USD: `0.0087884`
- Artwork observations: `8`
- Card UI / print-marker observations: `0`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. Scene subjects: human female trainer.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| human female trainer | human female trainer | scene_subject | midground | salient | 0.99 |
| purple medium hair with black tips and blunt bangs | hair purple medium black tips blunt bangs | human_appearance | midground | salient | 0.98 |
| white long sleeve robe with light blue gloves | white long sleeve robe light blue gloves | clothing | midground | salient | 0.98 |
| black inner garment with blue vertical stripes | black inner garment blue vertical stripes | clothing | midground | salient | 0.95 |
| blue and black crown with large spiral ornaments | crown blue black spirals | clothing | midground | salient | 0.97 |
| hands crossed in front | hands crossed in front | human_appearance | midground | salient | 0.96 |
| neutral mouth, eyes focused forward | face neutral mouth eyes | human_appearance | midground | salient | 0.93 |
| stone stairs and walls, indoor or enclosed space | stone stairs walls enclosed space | environment | background | salient | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| none recorded | | | | |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | subjects | scene subject | obs_subject_001 | 0.99 |
| fact_002 | human_appearance | hair color and style | obs_hair_001 | 0.98 |
| fact_003 | clothing | outer garment | obs_clothing_001 | 0.98 |
| fact_004 | clothing | inner garment color and pattern | obs_clothing_002 | 0.95 |
| fact_005 | clothing | wears crown | obs_accessory_001 | 0.97 |
| fact_006 | human_appearance | hand posture | obs_hand_pose_001 | 0.96 |
| fact_007 | human_appearance | face expression | obs_facial_evidence_001 | 0.93 |
| fact_008 | environment | environment setting | obs_environment_001 | 0.95 |

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
| creature_anatomy | not_applicable | none | not_applicable |  |
| clothing | complete | none | high |  |
| objects_and_props | none_visible | none | not_applicable |  |
| environment | complete | none | high |  |
| composition | none_visible | none | not_applicable |  |
| color_and_light | complete | none | high |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | partial_due_to_low_resolution | medium | medium | name_text: unable to read text with certainty; collector_number: unable to read text with certainty; set_symbol: unable to read symbol with certainty; rarity_mark: unable to read symbol with certainty; copyright_line: unable to read text with certainty; illustrator_text: unable to read text with certainty |
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
| hair purple medium black tips blunt bangs | obs_hair_001 |
| white long sleeve robe light blue gloves | obs_clothing_001 |
| black inner garment blue vertical stripes | obs_clothing_002 |
| crown blue black spirals | obs_accessory_001 |
| hands crossed in front | obs_hand_pose_001 |
| face neutral mouth eyes | obs_facial_evidence_001 |
| stone stairs walls enclosed space | obs_environment_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| forward orientation | obs_hand_pose_001, obs_subject_001 | deterministic_rule | 0.99 |
| gloves | obs_clothing_001 | deterministic_rule | 0.98 |
| hands crossed | obs_subject_001 | deterministic_rule | 0.99 |
| spiral motif | obs_accessory_001 | deterministic_rule | 0.92 |
| stairs | obs_environment_001 | deterministic_rule | 0.95 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: human female trainer.
- Quality flags: `potential_module_incomplete_or_low_evidence`, `potential_module_review_conflicts_with_entries`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "human female trainer",
      "normalized_label": "human female trainer",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hair_001",
      "kind": "human_appearance",
      "label": "purple medium hair with black tips and blunt bangs",
      "normalized_label": "hair purple medium black tips blunt bangs",
      "scene_layer": "midground",
      "frame_position": "head",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_001",
      "kind": "clothing",
      "label": "white long sleeve robe with light blue gloves",
      "normalized_label": "white long sleeve robe light blue gloves",
      "scene_layer": "midground",
      "frame_position": "torso_and_arms",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_002",
      "kind": "clothing",
      "label": "black inner garment with blue vertical stripes",
      "normalized_label": "black inner garment blue vertical stripes",
      "scene_layer": "midground",
      "frame_position": "torso",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_accessory_001",
      "kind": "clothing",
      "label": "blue and black crown with large spiral ornaments",
      "normalized_label": "crown blue black spirals",
      "scene_layer": "midground",
      "frame_position": "headwear",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hand_pose_001",
      "kind": "human_appearance",
      "label": "hands crossed in front",
      "normalized_label": "hands crossed in front",
      "scene_layer": "midground",
      "frame_position": "hands",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_facial_evidence_001",
      "kind": "human_appearance",
      "label": "neutral mouth, eyes focused forward",
      "normalized_label": "face neutral mouth eyes",
      "scene_layer": "midground",
      "frame_position": "face",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.93,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "stone stairs and walls, indoor or enclosed space",
      "normalized_label": "stone stairs walls enclosed space",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_001",
      "module": "subjects",
      "field_path": "[0]",
      "claim": "scene subject",
      "value": "human female trainer",
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
      "value": "purple medium hair with black tips and blunt bangs",
      "supporting_observation_ids": [
        "obs_hair_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_003",
      "module": "clothing",
      "field_path": "garments",
      "claim": "outer garment",
      "value": "white long sleeve robe",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "clothing",
      "field_path": "garments",
      "claim": "inner garment color and pattern",
      "value": "black with blue vertical stripes",
      "supporting_observation_ids": [
        "obs_clothing_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_005",
      "module": "clothing",
      "field_path": "accessories",
      "claim": "wears crown",
      "value": "blue and black crown with large spiral ornaments",
      "supporting_observation_ids": [
        "obs_accessory_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_006",
      "module": "human_appearance",
      "field_path": "pose",
      "claim": "hand posture",
      "value": "hands crossed in front",
      "supporting_observation_ids": [
        "obs_hand_pose_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_007",
      "module": "human_appearance",
      "field_path": "facial_evidence",
      "claim": "face expression",
      "value": "neutral mouth, eyes forward",
      "supporting_observation_ids": [
        "obs_facial_evidence_001"
      ],
      "confidence": 0.93,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_008",
      "module": "environment",
      "field_path": "setting",
      "claim": "environment setting",
      "value": "stone stairs and walls, indoor or enclosed space",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "human female trainer",
      "identity_confidence": 0.99,
      "anatomy": [
        "arms",
        "face",
        "hands",
        "neck",
        "shoulders"
      ],
      "physical_features": [
        "blunt bangs",
        "purple hair with black tips"
      ],
      "pose": [
        "hands crossed"
      ],
      "orientation": "forward",
      "action_state": [],
      "facial_evidence": {
        "eyes": "open, forward",
        "mouth": "neutral",
        "eyebrows": "partially visible, neutral",
        "face_position": "frontal",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [
        "black inner garment with blue stripes",
        "blue and black crown with spirals",
        "blue gloves",
        "white robe"
      ],
      "colors": [
        "black",
        "blue",
        "purple",
        "white"
      ],
      "visibility": "visible"
    }
  ],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [],
  "scene_layers": {
    "foreground": [],
    "midground": [
      "obs_accessory_001",
      "obs_clothing_001",
      "obs_clothing_002",
      "obs_facial_evidence_001",
      "obs_hair_001",
      "obs_hand_pose_001",
      "obs_subject_001"
    ],
    "background": [
      "obs_environment_001"
    ]
  },
  "environment": {
    "setting": [
      "indoor or enclosed space",
      "stone stairs",
      "stone walls"
    ],
    "indoor_outdoor": "indoor",
    "sky": [],
    "ground": [],
    "terrain": [
      "stone"
    ],
    "plants": [],
    "architecture": [
      "stone architecture"
    ],
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
      "black",
      "blue",
      "gray stone",
      "purple",
      "white"
    ],
    "lighting": [
      "soft indoor lighting"
    ],
    "shadows": [
      "soft shadows"
    ],
    "highlights": [
      "soft highlights on hair and clothing"
    ],
    "composition": [
      "centered subject",
      "vertical orientation"
    ],
    "camera_angle": "frontal eye-level",
    "framing": "tight medium shot",
    "cropping": [],
    "depth": "medium depth",
    "motion_cues": [],
    "motifs": [
      "spiral shapes on crown"
    ],
    "repeated_shapes": [
      "spirals"
    ],
    "style_cues": [
      "digital art"
    ],
    "supporting_observation_ids": [
      "obs_accessory_001",
      "obs_environment_001",
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
        "fact_006",
        "fact_007"
      ],
      "visible_body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "hair",
          "visibility": "visible",
          "details": [
            "purple medium hair with black tips and blunt bangs"
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
          "face_position": "frontal",
          "eyes": "open, forward",
          "mouth": "neutral",
          "eyebrows": "partially visible, neutral",
          "other_visible_evidence": [],
          "supporting_observation_ids": [
            "obs_facial_evidence_001"
          ],
          "confidence": 0.93
        }
      ],
      "hair": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "purple medium hair with black tips and blunt bangs",
          "details": [
            "blunt bangs",
            "purple hair with black tips"
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
          "label": "hands crossed in front",
          "details": [
            "hands crossed"
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
        "fact_003",
        "fact_004",
        "fact_005"
      ],
      "garments": [
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "torso and arms",
          "garment": "white long sleeve robe",
          "neckline_type": "",
          "sleeve_type": "long sleeves",
          "colors": [
            "white"
          ],
          "visible_details": [
            "light blue gloves"
          ],
          "supporting_observation_ids": [
            "obs_clothing_001"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "torso",
          "garment": "black inner garment with blue vertical stripes",
          "neckline_type": "",
          "sleeve_type": "",
          "colors": [
            "black",
            "blue"
          ],
          "visible_details": [
            "blue vertical stripes"
          ],
          "supporting_observation_ids": [
            "obs_clothing_002"
          ],
          "confidence": 0.95
        }
      ],
      "accessories": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "blue and black crown with large spiral ornaments",
          "details": [
            "blue and black colors",
            "large spiral shaped ornaments"
          ],
          "supporting_observation_ids": [
            "obs_accessory_001"
          ],
          "confidence": 0.97
        }
      ]
    },
    "objects_and_props": {
      "fact_ids": [],
      "object_observation_ids": []
    },
    "environment": {
      "fact_ids": [
        "fact_008"
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
        "obs_accessory_001",
        "obs_clothing_001",
        "obs_environment_001",
        "obs_hair_001",
        "obs_subject_001"
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
        "hair purple medium black tips blunt bangs",
        "white long sleeve robe light blue gloves",
        "black inner garment blue vertical stripes",
        "crown blue black spirals",
        "hands crossed in front",
        "face neutral mouth eyes",
        "stone stairs walls enclosed space"
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
      "review_status": "partial_due_to_low_resolution",
      "omission_risk": "medium",
      "evidence_quality": "medium",
      "abstentions": [
        {
          "field_path": "name_text",
          "reason": "unable to read text with certainty",
          "affected_observation_ids": []
        },
        {
          "field_path": "collector_number",
          "reason": "unable to read text with certainty",
          "affected_observation_ids": []
        },
        {
          "field_path": "set_symbol",
          "reason": "unable to read symbol with certainty",
          "affected_observation_ids": []
        },
        {
          "field_path": "rarity_mark",
          "reason": "unable to read symbol with certainty",
          "affected_observation_ids": []
        },
        {
          "field_path": "copyright_line",
          "reason": "unable to read text with certainty",
          "affected_observation_ids": []
        },
        {
          "field_path": "illustrator_text",
          "reason": "unable to read text with certainty",
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
      "term": "hair purple medium black tips blunt bangs",
      "supporting_observation_ids": [
        "obs_hair_001"
      ]
    },
    {
      "term": "white long sleeve robe light blue gloves",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ]
    },
    {
      "term": "black inner garment blue vertical stripes",
      "supporting_observation_ids": [
        "obs_clothing_002"
      ]
    },
    {
      "term": "crown blue black spirals",
      "supporting_observation_ids": [
        "obs_accessory_001"
      ]
    },
    {
      "term": "hands crossed in front",
      "supporting_observation_ids": [
        "obs_hand_pose_001"
      ]
    },
    {
      "term": "face neutral mouth eyes",
      "supporting_observation_ids": [
        "obs_facial_evidence_001"
      ]
    },
    {
      "term": "stone stairs walls enclosed space",
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
          "obs_hand_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "gloves",
        "source_observation_ids": [
          "obs_clothing_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "hands crossed",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
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
        "confidence": 0.95
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-075 - カスミの元気

- Branch: `trainer`
- Review status: `pending`
- Description confidence: `0.96`
- Attribute confidence: `0.93`
- Cost USD: `0.0104748`
- Artwork observations: `11`
- Card UI / print-marker observations: `4`
- Card UI module evidence references: `4`
- Derived digest: Fact digest. Scene subjects: female human character.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| female human character | female human | scene_subject | foreground | salient | 0.99 |
| orange hair tied in a ponytail | orange ponytail hair | hair | foreground | salient | 0.98 |
| female face with wink, mouth open smiling | female smiling winking face | human_face | foreground | salient | 0.95 |
| blue sports bra top | blue crop top | clothing | foreground | salient | 0.97 |
| blue shorts | blue shorts | clothing | foreground | salient | 0.97 |
| black wristbands on both wrists | black wristbands | accessory | foreground | salient | 0.96 |
| standing with left arm extended forward fingers spread, right arm bent to side in fist | standing pose with left arm forward fingers spread right arm bent fist | pose | foreground | salient | 0.96 |
| small green leafy potted plant | green leafy plant | plant | background | present | 0.93 |
| indoor gym or pool area with tiled floor and pool edge | indoor pool area | interior | background | present | 0.94 |
| blue metal pool railing | blue pool railing | structure | background | present | 0.93 |
| large light blue windows showing sky and foliage | large windows with sky and foliage | window | background | present | 0.94 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text カスミの元気 | card_ui_text | top_left | visible | 0.99 |
| supporter text in orange rounded rectangle at bottom | card_ui_text | bottom_center | visible | 0.98 |
| card set and number text 'm5 075/081 U' | card_ui_text | bottom_left | visible | 0.99 |
| illustrator credit 'Illus. En Morikura' | card_ui_text | bottom_left | visible | 0.95 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | subjects | There is a female human subject depicted in the artwork | obs_subject_001 | 0.99 |
| fact_002 | human_appearance | Hair is orange and styled in a ponytail held by a black hairband | obs_hair_001 | 0.98 |
| fact_003 | human_appearance | Face is visible with one eye winking and the mouth open smiling | obs_human_face_001 | 0.95 |
| fact_004 | clothing | The subject wears a blue sports bra top | obs_clothing_001 | 0.97 |
| fact_005 | clothing | The subject wears blue shorts | obs_clothing_002 | 0.97 |
| fact_006 | clothing | The subject has black wristbands on both wrists | obs_clothing_003 | 0.96 |
| fact_007 | creature_anatomy | The subject is standing with left arm extended forward fingers spread, right arm bent to the side with a fist | obs_pose_001 | 0.96 |
| fact_008 | environment | There is a small green leafy potted plant visible on the left side of the scene | obs_environment_001 | 0.93 |
| fact_009 | environment | The scene is indoors, specifically an indoor swimming pool or gym area with tiled flooring | obs_environment_002, obs_environment_003, obs_environment_004 | 0.94 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_010 | Card name text is visible: カスミの元気 (Kasumi no Genki in Japanese) | obs_card_ui_001 | 0.99 |
| fact_011 | Supporter designation text is visible in an orange rounded rectangle at the card bottom | obs_card_ui_002 | 0.98 |
| fact_012 | Card set and number text 'm5 075/081 U' is visible at the bottom left | obs_card_ui_003 | 0.99 |
| fact_013 | Illustrator credit text 'Illus. En Morikura' is visible at bottom left | obs_card_ui_004 | 0.95 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
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
    "obs_card_ui_003"
  ],
  "set_symbol_observation_ids": [],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [],
  "bottom_line_text_observation_ids": [
    "obs_card_ui_002"
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
| subjects | complete | none | high |  |
| human_appearance | complete | none | high |  |
| creature_anatomy | complete | low | high |  |
| clothing | complete | none | high |  |
| objects_and_props | none_visible | none | not_applicable |  |
| environment | complete | low | high |  |
| composition | complete | low | high |  |
| color_and_light | complete | low | high |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | complete | none | high |  |

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
| female human | obs_subject_001 |
| orange ponytail hair | obs_hair_001 |
| blue crop top | obs_clothing_001 |
| blue shorts | obs_clothing_002 |
| black wristbands | obs_clothing_003 |
| standing pose | obs_pose_001 |
| indoor pool area | obs_environment_002, obs_environment_003, obs_environment_004 |
| green leafy plant | obs_environment_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| building | obs_environment_003 | deterministic_rule | 0.93 |
| forward-left orientation | obs_human_face_001, obs_pose_001, obs_subject_001 | deterministic_rule | 0.99 |
| forward-right orientation | obs_pose_001 | deterministic_rule | 0.96 |
| plant | obs_environment_001 | deterministic_rule | 0.93 |
| reaching | obs_human_face_001, obs_pose_001, obs_subject_001 | deterministic_rule | 0.99 |
| right arm bent fist | obs_human_face_001, obs_pose_001, obs_subject_001 | deterministic_rule | 0.99 |
| sky | obs_environment_004 | deterministic_rule | 0.94 |
| standing | obs_human_face_001, obs_pose_001, obs_subject_001 | deterministic_rule | 0.99 |
| window | obs_environment_004 | deterministic_rule | 0.94 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: female human character.
- Quality flags: `none`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "female human character",
      "normalized_label": "female human",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hair_001",
      "kind": "hair",
      "label": "orange hair tied in a ponytail",
      "normalized_label": "orange ponytail hair",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_human_face_001",
      "kind": "human_face",
      "label": "female face with wink, mouth open smiling",
      "normalized_label": "female smiling winking face",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_001",
      "kind": "clothing",
      "label": "blue sports bra top",
      "normalized_label": "blue crop top",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_002",
      "kind": "clothing",
      "label": "blue shorts",
      "normalized_label": "blue shorts",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_003",
      "kind": "accessory",
      "label": "black wristbands on both wrists",
      "normalized_label": "black wristbands",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_001",
      "kind": "pose",
      "label": "standing with left arm extended forward fingers spread, right arm bent to side in fist",
      "normalized_label": "standing pose with left arm forward fingers spread right arm bent fist",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "plant",
      "label": "small green leafy potted plant",
      "normalized_label": "green leafy plant",
      "scene_layer": "background",
      "frame_position": "left",
      "visibility": "visible",
      "salience": "present",
      "confidence": 0.93,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_environment_002",
      "kind": "interior",
      "label": "indoor gym or pool area with tiled floor and pool edge",
      "normalized_label": "indoor pool area",
      "scene_layer": "background",
      "frame_position": "center_right",
      "visibility": "visible",
      "salience": "present",
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_003",
      "kind": "structure",
      "label": "blue metal pool railing",
      "normalized_label": "blue pool railing",
      "scene_layer": "background",
      "frame_position": "right",
      "visibility": "visible",
      "salience": "present",
      "confidence": 0.93,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_environment_004",
      "kind": "window",
      "label": "large light blue windows showing sky and foliage",
      "normalized_label": "large windows with sky and foliage",
      "scene_layer": "background",
      "frame_position": "top",
      "visibility": "visible",
      "salience": "present",
      "confidence": 0.94,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_card_ui_001",
      "kind": "card_ui_text",
      "label": "card name text カスミの元気",
      "normalized_label": "card name text Kasumi no Genki (Japanese)",
      "scene_layer": "ui",
      "frame_position": "top_left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_002",
      "kind": "card_ui_text",
      "label": "supporter text in orange rounded rectangle at bottom",
      "normalized_label": "supporter type text",
      "scene_layer": "ui",
      "frame_position": "bottom_center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_003",
      "kind": "card_ui_text",
      "label": "card set and number text 'm5 075/081 U'",
      "normalized_label": "set code and card number",
      "scene_layer": "ui",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_004",
      "kind": "card_ui_text",
      "label": "illustrator credit 'Illus. En Morikura'",
      "normalized_label": "illustrator text",
      "scene_layer": "ui",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "medium"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_001",
      "module": "subjects",
      "field_path": "scene_subject[0]",
      "claim": "There is a female human subject depicted in the artwork",
      "value": "female human character",
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
      "claim": "Hair is orange and styled in a ponytail held by a black hairband",
      "value": "orange ponytail hair",
      "supporting_observation_ids": [
        "obs_hair_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_003",
      "module": "human_appearance",
      "field_path": "face",
      "claim": "Face is visible with one eye winking and the mouth open smiling",
      "value": "female smiling winking face",
      "supporting_observation_ids": [
        "obs_human_face_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "clothing",
      "field_path": "garments[0]",
      "claim": "The subject wears a blue sports bra top",
      "value": "blue crop top",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_005",
      "module": "clothing",
      "field_path": "garments[1]",
      "claim": "The subject wears blue shorts",
      "value": "blue shorts",
      "supporting_observation_ids": [
        "obs_clothing_002"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_006",
      "module": "clothing",
      "field_path": "accessories[0]",
      "claim": "The subject has black wristbands on both wrists",
      "value": "black wristbands",
      "supporting_observation_ids": [
        "obs_clothing_003"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_007",
      "module": "creature_anatomy",
      "field_path": "pose_orientation",
      "claim": "The subject is standing with left arm extended forward fingers spread, right arm bent to the side with a fist",
      "value": "standing pose with left arm forward fingers spread right arm bent fist",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_008",
      "module": "environment",
      "field_path": "plants[0]",
      "claim": "There is a small green leafy potted plant visible on the left side of the scene",
      "value": "green leafy plant",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.93,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_009",
      "module": "environment",
      "field_path": "setting",
      "claim": "The scene is indoors, specifically an indoor swimming pool or gym area with tiled flooring",
      "value": "indoor pool area",
      "supporting_observation_ids": [
        "obs_environment_002",
        "obs_environment_003",
        "obs_environment_004"
      ],
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_010",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text[0]",
      "claim": "Card name text is visible: カスミの元気 (Kasumi no Genki in Japanese)",
      "value": "カスミの元気",
      "supporting_observation_ids": [
        "obs_card_ui_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_011",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text[0]",
      "claim": "Supporter designation text is visible in an orange rounded rectangle at the card bottom",
      "value": "supporter type text",
      "supporting_observation_ids": [
        "obs_card_ui_002"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_012",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number[0]",
      "claim": "Card set and number text 'm5 075/081 U' is visible at the bottom left",
      "value": "m5 075/081 U",
      "supporting_observation_ids": [
        "obs_card_ui_003"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_013",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text[0]",
      "claim": "Illustrator credit text 'Illus. En Morikura' is visible at bottom left",
      "value": "Illus. En Morikura",
      "supporting_observation_ids": [
        "obs_card_ui_004"
      ],
      "confidence": 0.95,
      "evidence_strength": "medium"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "female human character",
      "identity_confidence": 0.99,
      "anatomy": [
        "arms",
        "face",
        "hair",
        "hands",
        "head",
        "legs",
        "neck",
        "shoulders",
        "torso"
      ],
      "physical_features": [
        "orange hair ponytail",
        "skin visible"
      ],
      "pose": [
        "reaching",
        "right arm bent fist",
        "standing"
      ],
      "orientation": "forward-left",
      "action_state": [
        "smiling",
        "winking"
      ],
      "facial_evidence": {
        "eyes": "one eye winking, one eye open",
        "mouth": "open smiling mouth",
        "eyebrows": "visible",
        "face_position": "centered",
        "other_visible_evidence": [
          "clear face"
        ]
      },
      "clothing_or_accessories": [
        "black wristbands",
        "blue crop top",
        "blue shorts"
      ],
      "colors": [
        "black",
        "blue",
        "orange",
        "skin tone"
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
      "obs_environment_003",
      "obs_environment_004"
    ]
  },
  "environment": {
    "setting": [
      "indoor pool area"
    ],
    "indoor_outdoor": "indoor",
    "sky": [],
    "ground": [
      "tiled floor"
    ],
    "terrain": [],
    "plants": [
      "green leafy plant"
    ],
    "architecture": [
      "blue metal pool railing",
      "large windows",
      "pool edge"
    ],
    "water": [
      "visible pool water"
    ],
    "weather": [],
    "time_of_day_cues": [
      "daytime light"
    ],
    "supporting_observation_ids": [
      "obs_environment_001",
      "obs_environment_002",
      "obs_environment_003",
      "obs_environment_004"
    ]
  },
  "objects_and_props": [],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "blue",
      "green",
      "orange",
      "skin tone",
      "white highlights"
    ],
    "lighting": [
      "diffuse bright indoor light",
      "soft shadows"
    ],
    "shadows": [
      "soft shadows on floor"
    ],
    "highlights": [
      "strong highlights on hair and skin"
    ],
    "composition": [
      "background windows create depth",
      "subject centered in frame"
    ],
    "camera_angle": "eye level frontal angle",
    "framing": "tight medium shot",
    "cropping": [
      "full subject visible"
    ],
    "depth": "visible depth with layered background",
    "motion_cues": [
      "implied forward reach with left hand",
      "static pose"
    ],
    "motifs": [
      "clean indoor pool setting",
      "sportswear theme"
    ],
    "repeated_shapes": [
      "rectangular tiles",
      "window panes"
    ],
    "style_cues": [
      "bright color palette",
      "clean linework"
    ],
    "supporting_observation_ids": [
      "obs_clothing_001",
      "obs_clothing_002",
      "obs_clothing_003",
      "obs_environment_002",
      "obs_environment_004",
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
        "fact_003"
      ],
      "visible_body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "face",
          "visibility": "visible",
          "details": [
            "mouth open smiling",
            "one eye winking"
          ],
          "supporting_observation_ids": [
            "obs_human_face_001"
          ],
          "confidence": 0.95
        }
      ],
      "facial_evidence": [
        {
          "subject_observation_id": "obs_subject_001",
          "face_position": "centered",
          "eyes": "one eye winking, one eye open",
          "mouth": "open smiling mouth",
          "eyebrows": "visible",
          "other_visible_evidence": [
            "clear face"
          ],
          "supporting_observation_ids": [
            "obs_human_face_001"
          ],
          "confidence": 0.95
        }
      ],
      "hair": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "orange ponytail hair",
          "details": [
            "hair tied back in ponytail with black hairband"
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
      "fact_ids": [
        "fact_007"
      ],
      "body_regions": [],
      "physical_features": [],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "reaching",
            "right arm bent fist",
            "standing"
          ],
          "orientation": "forward-left",
          "action_state": [
            "smiling",
            "winking"
          ],
          "supporting_observation_ids": [
            "obs_human_face_001",
            "obs_pose_001"
          ],
          "confidence": 0.96
        }
      ],
      "effects": []
    },
    "clothing": {
      "fact_ids": [
        "fact_004",
        "fact_005",
        "fact_006"
      ],
      "garments": [
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "torso",
          "garment": "blue crop top",
          "neckline_type": "round neckline",
          "sleeve_type": "sleeveless",
          "colors": [
            "blue"
          ],
          "visible_details": [
            "sportswear",
            "tight fit"
          ],
          "supporting_observation_ids": [
            "obs_clothing_001"
          ],
          "confidence": 0.97
        },
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "legs",
          "garment": "blue shorts",
          "neckline_type": "",
          "sleeve_type": "",
          "colors": [
            "blue"
          ],
          "visible_details": [
            "sportswear",
            "tight fit"
          ],
          "supporting_observation_ids": [
            "obs_clothing_002"
          ],
          "confidence": 0.97
        }
      ],
      "accessories": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "black wristbands",
          "details": [
            "one on each wrist"
          ],
          "supporting_observation_ids": [
            "obs_clothing_003"
          ],
          "confidence": 0.96
        }
      ]
    },
    "objects_and_props": {
      "fact_ids": [],
      "object_observation_ids": []
    },
    "environment": {
      "fact_ids": [
        "fact_008",
        "fact_009"
      ],
      "observation_ids": [
        "obs_environment_001",
        "obs_environment_002",
        "obs_environment_003",
        "obs_environment_004"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_environment_002",
        "obs_environment_004",
        "obs_subject_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_environment_002",
        "obs_hair_001",
        "obs_subject_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": []
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
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
        "obs_card_ui_003"
      ],
      "set_symbol_observation_ids": [],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [],
      "bottom_line_text_observation_ids": [
        "obs_card_ui_002"
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
        "female human",
        "orange ponytail hair",
        "blue crop top",
        "blue shorts",
        "black wristbands",
        "standing pose",
        "indoor pool area",
        "green leafy plant"
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
      "omission_risk": "low",
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
      "term": "female human",
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
      "term": "blue crop top",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ]
    },
    {
      "term": "blue shorts",
      "supporting_observation_ids": [
        "obs_clothing_002"
      ]
    },
    {
      "term": "black wristbands",
      "supporting_observation_ids": [
        "obs_clothing_003"
      ]
    },
    {
      "term": "standing pose",
      "supporting_observation_ids": [
        "obs_pose_001"
      ]
    },
    {
      "term": "indoor pool area",
      "supporting_observation_ids": [
        "obs_environment_002",
        "obs_environment_003",
        "obs_environment_004"
      ]
    },
    {
      "term": "green leafy plant",
      "supporting_observation_ids": [
        "obs_environment_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "building",
        "source_observation_ids": [
          "obs_environment_003"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.93
      },
      {
        "concept": "forward-left orientation",
        "source_observation_ids": [
          "obs_human_face_001",
          "obs_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "forward-right orientation",
        "source_observation_ids": [
          "obs_pose_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.96
      },
      {
        "concept": "plant",
        "source_observation_ids": [
          "obs_environment_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.93
      },
      {
        "concept": "reaching",
        "source_observation_ids": [
          "obs_human_face_001",
          "obs_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "right arm bent fist",
        "source_observation_ids": [
          "obs_human_face_001",
          "obs_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "sky",
        "source_observation_ids": [
          "obs_environment_004"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.94
      },
      {
        "concept": "standing",
        "source_observation_ids": [
          "obs_human_face_001",
          "obs_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "window",
        "source_observation_ids": [
          "obs_environment_004"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.94
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-TCGCOLLECTOR11526-019 - Magnetic Storm

- Branch: `stadium`
- Review status: `needs_review`
- Description confidence: `0.98`
- Attribute confidence: `0.95`
- Cost USD: `0.008074`
- Artwork observations: `7`
- Card UI / print-marker observations: `0`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. Visible observations: dark sky with aurora borealis, aurora borealis, lightning, lightning, mountains, trees, ground. Semantic facts: night, aurora borealis, lightning storm, mountainous terrain, leafless black trees.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| night sky with aurora borealis | dark sky with aurora borealis | environment | background | high | 0.99 |
| green and red aurora light bands | aurora borealis | environment | background | high | 0.98 |
| white lightning bolts | lightning | environment | background | high | 0.99 |
| pink-tinged lightning bolts | lightning | environment | background | high | 0.95 |
| dark mountains | mountains | environment | background | medium | 0.95 |
| leafless black trees | trees | environment | background | medium | 0.96 |
| dark ground area | ground | environment | midground | medium | 0.9 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| none recorded | | | | |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_environment_001 | environment | setting | obs_aurora_borealis_001, obs_ground_001, obs_lightning_001, obs_lightning_002, obs_mountains_001, obs_sky_001, obs_trees_001 | 0.95 |
| fact_environment_002 | environment | sky appearance | obs_aurora_borealis_001, obs_sky_001 | 0.98 |
| fact_environment_003 | environment | weather phenomenon | obs_lightning_001, obs_lightning_002 | 0.99 |
| fact_environment_004 | environment | terrain type | obs_ground_001, obs_mountains_001 | 0.9 |
| fact_environment_005 | environment | vegetation | obs_trees_001 | 0.96 |

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
| environment | complete | low | high |  |
| composition | likely_complete | low | high |  |
| color_and_light | likely_complete | low | high |  |
| visual_effects | likely_complete | low | high |  |
| card_ui_and_print_markers | none_visible | none | high |  |
| counts | none_visible | none | high |  |
| relationships | none_visible | none | high |  |
| surface_and_scan_cues | none_visible | none | high |  |
| uncertainty_and_abstentions | none_visible | none | high |  |
| fact_grounded_search_terms | none_visible | none | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| sem_fact_001 | environment | night |  | obs_sky_001 | dark sky | 0.98 |
| sem_fact_002 | environment | aurora borealis |  | obs_aurora_borealis_001 | green and red aurora light bands | 0.97 |
| sem_fact_003 | environment | lightning storm |  | obs_lightning_001, obs_lightning_002 | lightning bolts white and pink lightning bolts | 0.99 |
| sem_fact_004 | environment | mountainous terrain |  | obs_mountains_001 | dark mountains | 0.95 |
| sem_fact_005 | environment | leafless black trees |  | obs_trees_001 | dark leafless trees | 0.96 |

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
| dark sky with aurora borealis | obs_sky_001 |
| aurora borealis | obs_aurora_borealis_001 |
| lightning | obs_lightning_001 |
| mountains | obs_mountains_001 |
| trees | obs_trees_001 |
| ground | obs_ground_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| aurora borealis | obs_aurora_borealis_001 | deterministic_rule | 0.97 |
| aurora-like light bands | obs_aurora_borealis_001, obs_sky_001 | deterministic_rule | 0.99 |
| centered composition | obs_lightning_001, obs_lightning_002 | deterministic_rule | 0.92 |
| leafless black trees | obs_trees_001 | deterministic_rule | 0.96 |
| lightning | obs_lightning_001, obs_lightning_002 | deterministic_rule | 0.99 |
| lightning storm | obs_lightning_001, obs_lightning_002 | deterministic_rule | 0.99 |
| mountainous terrain | obs_mountains_001 | deterministic_rule | 0.95 |
| night | obs_sky_001 | deterministic_rule | 0.98 |
| sky | obs_sky_001 | deterministic_rule | 0.99 |
| terrain | obs_ground_001 | deterministic_rule | 0.92 |
| tree | obs_trees_001 | deterministic_rule | 0.96 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: dark sky with aurora borealis, aurora borealis, lightning, lightning, mountains, trees, ground. Semantic facts: night, aurora borealis, lightning storm, mountainous terrain, leafless black trees.
- Quality flags: `potential_module_review_conflicts_with_entries`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_sky_001",
      "kind": "environment",
      "label": "night sky with aurora borealis",
      "normalized_label": "dark sky with aurora borealis",
      "scene_layer": "background",
      "frame_position": "top center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_aurora_borealis_001",
      "kind": "environment",
      "label": "green and red aurora light bands",
      "normalized_label": "aurora borealis",
      "scene_layer": "background",
      "frame_position": "top center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_lightning_001",
      "kind": "environment",
      "label": "white lightning bolts",
      "normalized_label": "lightning",
      "scene_layer": "background",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_lightning_002",
      "kind": "environment",
      "label": "pink-tinged lightning bolts",
      "normalized_label": "lightning",
      "scene_layer": "background",
      "frame_position": "right center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_mountains_001",
      "kind": "environment",
      "label": "dark mountains",
      "normalized_label": "mountains",
      "scene_layer": "background",
      "frame_position": "middle",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_trees_001",
      "kind": "environment",
      "label": "leafless black trees",
      "normalized_label": "trees",
      "scene_layer": "background",
      "frame_position": "right",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_ground_001",
      "kind": "environment",
      "label": "dark ground area",
      "normalized_label": "ground",
      "scene_layer": "midground",
      "frame_position": "lower center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "setting",
      "claim": "setting",
      "value": "night outdoor stormy mountainous area with aurora",
      "supporting_observation_ids": [
        "obs_aurora_borealis_001",
        "obs_ground_001",
        "obs_lightning_001",
        "obs_lightning_002",
        "obs_mountains_001",
        "obs_sky_001",
        "obs_trees_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_002",
      "module": "environment",
      "field_path": "sky",
      "claim": "sky appearance",
      "value": "dark with green and red aurora light bands",
      "supporting_observation_ids": [
        "obs_aurora_borealis_001",
        "obs_sky_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_003",
      "module": "environment",
      "field_path": "weather",
      "claim": "weather phenomenon",
      "value": "lightning storm with visible bolts",
      "supporting_observation_ids": [
        "obs_lightning_001",
        "obs_lightning_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_004",
      "module": "environment",
      "field_path": "terrain",
      "claim": "terrain type",
      "value": "mountains and dark ground",
      "supporting_observation_ids": [
        "obs_ground_001",
        "obs_mountains_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_005",
      "module": "environment",
      "field_path": "plants",
      "claim": "vegetation",
      "value": "leafless black trees",
      "supporting_observation_ids": [
        "obs_trees_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [],
  "scene_layers": {
    "foreground": [],
    "midground": [
      "obs_ground_001"
    ],
    "background": [
      "obs_aurora_borealis_001",
      "obs_lightning_001",
      "obs_lightning_002",
      "obs_mountains_001",
      "obs_sky_001",
      "obs_trees_001"
    ]
  },
  "environment": {
    "setting": [
      "night outdoor stormy mountainous area with aurora"
    ],
    "indoor_outdoor": "outdoor",
    "sky": [
      "dark",
      "green and red aurora light bands"
    ],
    "ground": [
      "dark ground area"
    ],
    "terrain": [
      "mountains"
    ],
    "plants": [
      "leafless black trees"
    ],
    "architecture": [],
    "water": [],
    "weather": [
      "lightning storm"
    ],
    "time_of_day_cues": [
      "night"
    ],
    "supporting_observation_ids": [
      "obs_aurora_borealis_001",
      "obs_ground_001",
      "obs_lightning_001",
      "obs_lightning_002",
      "obs_mountains_001",
      "obs_sky_001",
      "obs_trees_001"
    ]
  },
  "objects_and_props": [],
  "relationships": [],
  "visual_design": {
    "palette": [
      "dark night colors",
      "green and red aurora lights",
      "white and pink lightning"
    ],
    "lighting": [
      "glowing lightning",
      "illuminated aurora"
    ],
    "shadows": [
      "dark shadows in terrain and mountains"
    ],
    "highlights": [
      "bright lightning highlights"
    ],
    "composition": [
      "aurora arcs across top",
      "centered lightning bolts"
    ],
    "camera_angle": "eye level",
    "framing": "illustration centered",
    "cropping": [],
    "depth": "deep, with foreground ground and background mountains and sky",
    "motion_cues": [
      "lightning bolts appearing"
    ],
    "motifs": [],
    "repeated_shapes": [
      "multiple lightning bolts"
    ],
    "style_cues": [
      "realistic environment"
    ],
    "supporting_observation_ids": [
      "obs_aurora_borealis_001",
      "obs_ground_001",
      "obs_lightning_001",
      "obs_lightning_002",
      "obs_mountains_001",
      "obs_sky_001",
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
        "fact_environment_001",
        "fact_environment_002",
        "fact_environment_003",
        "fact_environment_004",
        "fact_environment_005"
      ],
      "observation_ids": [
        "obs_aurora_borealis_001",
        "obs_ground_001",
        "obs_lightning_001",
        "obs_lightning_002",
        "obs_mountains_001",
        "obs_sky_001",
        "obs_trees_001"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_aurora_borealis_001",
        "obs_ground_001",
        "obs_lightning_001",
        "obs_lightning_002",
        "obs_mountains_001",
        "obs_sky_001",
        "obs_trees_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_aurora_borealis_001",
        "obs_lightning_001",
        "obs_lightning_002",
        "obs_sky_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": [
        "obs_aurora_borealis_001",
        "obs_lightning_001",
        "obs_lightning_002"
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
        "dark sky with aurora borealis",
        "aurora borealis",
        "lightning",
        "mountains",
        "trees",
        "ground"
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
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "sem_fact_001",
      "category": "environment",
      "label": "night",
      "subject_observation_id": "",
      "supporting_observation_ids": [
        "obs_sky_001"
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
          "dark sky"
        ],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.98,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "sem_fact_002",
      "category": "environment",
      "label": "aurora borealis",
      "subject_observation_id": "",
      "supporting_observation_ids": [
        "obs_aurora_borealis_001"
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
          "green and red aurora light bands"
        ],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.97,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "sem_fact_003",
      "category": "environment",
      "label": "lightning storm",
      "subject_observation_id": "",
      "supporting_observation_ids": [
        "obs_lightning_001",
        "obs_lightning_002"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [],
        "eyebrows": [],
        "facial_features": [],
        "body_language": [],
        "body_position": [],
        "motion_state": [
          "lightning bolts"
        ],
        "environment": [
          "white and pink lightning bolts"
        ],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.99,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "sem_fact_004",
      "category": "environment",
      "label": "mountainous terrain",
      "subject_observation_id": "",
      "supporting_observation_ids": [
        "obs_mountains_001"
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
          "dark mountains"
        ],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.95,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "sem_fact_005",
      "category": "environment",
      "label": "leafless black trees",
      "subject_observation_id": "",
      "supporting_observation_ids": [
        "obs_trees_001"
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
          "dark leafless trees"
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
      "term": "dark sky with aurora borealis",
      "supporting_observation_ids": [
        "obs_sky_001"
      ]
    },
    {
      "term": "aurora borealis",
      "supporting_observation_ids": [
        "obs_aurora_borealis_001"
      ]
    },
    {
      "term": "lightning",
      "supporting_observation_ids": [
        "obs_lightning_001"
      ]
    },
    {
      "term": "mountains",
      "supporting_observation_ids": [
        "obs_mountains_001"
      ]
    },
    {
      "term": "trees",
      "supporting_observation_ids": [
        "obs_trees_001"
      ]
    },
    {
      "term": "ground",
      "supporting_observation_ids": [
        "obs_ground_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "aurora borealis",
        "source_observation_ids": [
          "obs_aurora_borealis_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
      },
      {
        "concept": "aurora-like light bands",
        "source_observation_ids": [
          "obs_aurora_borealis_001",
          "obs_sky_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "centered composition",
        "source_observation_ids": [
          "obs_lightning_001",
          "obs_lightning_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "leafless black trees",
        "source_observation_ids": [
          "obs_trees_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.96
      },
      {
        "concept": "lightning",
        "source_observation_ids": [
          "obs_lightning_001",
          "obs_lightning_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "lightning storm",
        "source_observation_ids": [
          "obs_lightning_001",
          "obs_lightning_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "mountainous terrain",
        "source_observation_ids": [
          "obs_mountains_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "night",
        "source_observation_ids": [
          "obs_sky_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "sky",
        "source_observation_ids": [
          "obs_sky_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "terrain",
        "source_observation_ids": [
          "obs_ground_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "tree",
        "source_observation_ids": [
          "obs_trees_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.96
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
- Cost USD: `0.00772`
- Artwork observations: `12`
- Card UI / print-marker observations: `0`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. Visible observations: stadium architecture, large brown wooden structure, green circular emblem, blue sky, white clouds, green grass field, tall green trees, brown wooden pathway. Counts: traffic cones: 6.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| stadium architecture | stadium architecture | object | midground | high | 0.99 |
| large brown wooden structure | large brown wooden structure | object | midground | high | 0.95 |
| green circular emblem | green circular emblem | object | midground | medium | 0.9 |
| blue sky | blue sky | environment | background | high | 1 |
| white clouds | white clouds | environment | background | medium | 0.98 |
| green grass field | green grass field | environment | midground | high | 0.99 |
| tall green trees | tall green trees | environment | background | medium | 0.98 |
| brown wooden pathway | brown wooden pathway | object | foreground | medium | 0.95 |
| metal fence | metal fence | object | foreground | medium | 0.95 |
| white and orange traffic cones | white and orange traffic cones | object | foreground | medium | 0.95 |
| purple and blue track | purple and blue track | object | midground | high | 0.94 |
| sunlight lighting | sunlight lighting | environment | background | medium | 0.9 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| none recorded | | | | |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | environment | setting | obs_large_brown_wooden_structure_001, obs_stadium_architecture_001 | 0.99 |
| fact_002 | environment | sky | obs_blue_sky_001 | 1 |
| fact_003 | environment | sky | obs_white_clouds_001 | 0.98 |
| fact_004 | environment | plants | obs_tall_green_trees_001 | 0.98 |
| fact_005 | environment | ground | obs_green_grass_field_001 | 0.99 |
| fact_006 | objects_and_props | object | obs_brown_wooden_pathway_001 | 0.95 |
| fact_007 | objects_and_props | object | obs_metal_fence_001 | 0.95 |
| fact_008 | objects_and_props | object | obs_white_and_orange_traffic_cones_001 | 0.95 |
| fact_009 | objects_and_props | object | obs_purple_and_blue_track_001 | 0.94 |
| fact_010 | environment | lighting | obs_sunlight_lighting_001 | 0.9 |

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
| composition | none_visible | none | high |  |
| color_and_light | complete | low | high |  |
| visual_effects | none_visible | none | high |  |
| card_ui_and_print_markers | partial_due_to_low_resolution | medium | medium | name_text_observation_ids: text partly low resolution or unclear; collector_number_observation_ids: text partly low resolution or unclear; set_symbol_observation_ids: text partly low resolution or unclear; rarity_mark_observation_ids: text partly low resolution or unclear; copyright_line_observation_ids: text partly low resolution or unclear |
| counts | complete | low | high |  |
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
| traffic cones | exact | 6 | obs_white_and_orange_traffic_cones_001 | 0.95 |

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
| stadium architecture | obs_stadium_architecture_001 |
| large brown wooden structure | obs_large_brown_wooden_structure_001 |
| green circular emblem | obs_green_circular_emblem_001 |
| blue sky | obs_blue_sky_001 |
| white clouds | obs_white_clouds_001 |
| green grass field | obs_green_grass_field_001 |
| tall green trees | obs_tall_green_trees_001 |
| brown wooden pathway | obs_brown_wooden_pathway_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| building | obs_large_brown_wooden_structure_001, obs_stadium_architecture_001 | deterministic_rule | 0.99 |
| centered composition | obs_stadium_architecture_001 | deterministic_rule | 0.92 |
| circular motif | obs_green_circular_emblem_001 | deterministic_rule | 0.9 |
| cloud | obs_white_clouds_001 | deterministic_rule | 0.98 |
| fence | obs_metal_fence_001 | deterministic_rule | 0.95 |
| sky | obs_blue_sky_001 | deterministic_rule | 1 |
| terrain | obs_green_grass_field_001 | deterministic_rule | 0.99 |
| tree | obs_tall_green_trees_001 | deterministic_rule | 0.98 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: stadium architecture, large brown wooden structure, green circular emblem, blue sky, white clouds, green grass field, tall green trees, brown wooden pathway. Counts: traffic cones: 6.
- Quality flags: `potential_module_fact_reference_missing`, `potential_module_incomplete_or_low_evidence`, `potential_module_review_conflicts_with_entries`, `potential_salient_object_missing_count_reference`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_stadium_architecture_001",
      "kind": "object",
      "label": "stadium architecture",
      "normalized_label": "stadium architecture",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_large_brown_wooden_structure_001",
      "kind": "object",
      "label": "large brown wooden structure",
      "normalized_label": "large brown wooden structure",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_green_circular_emblem_001",
      "kind": "object",
      "label": "green circular emblem",
      "normalized_label": "green circular emblem",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_blue_sky_001",
      "kind": "environment",
      "label": "blue sky",
      "normalized_label": "blue sky",
      "scene_layer": "background",
      "frame_position": "top",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_white_clouds_001",
      "kind": "environment",
      "label": "white clouds",
      "normalized_label": "white clouds",
      "scene_layer": "background",
      "frame_position": "top",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_green_grass_field_001",
      "kind": "environment",
      "label": "green grass field",
      "normalized_label": "green grass field",
      "scene_layer": "midground",
      "frame_position": "bottom",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_tall_green_trees_001",
      "kind": "environment",
      "label": "tall green trees",
      "normalized_label": "tall green trees",
      "scene_layer": "background",
      "frame_position": "right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_brown_wooden_pathway_001",
      "kind": "object",
      "label": "brown wooden pathway",
      "normalized_label": "brown wooden pathway",
      "scene_layer": "foreground",
      "frame_position": "bottom_right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_metal_fence_001",
      "kind": "object",
      "label": "metal fence",
      "normalized_label": "metal fence",
      "scene_layer": "foreground",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_white_and_orange_traffic_cones_001",
      "kind": "object",
      "label": "white and orange traffic cones",
      "normalized_label": "white and orange traffic cones",
      "scene_layer": "foreground",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_purple_and_blue_track_001",
      "kind": "object",
      "label": "purple and blue track",
      "normalized_label": "purple and blue track",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_sunlight_lighting_001",
      "kind": "environment",
      "label": "sunlight lighting",
      "normalized_label": "sunlight lighting",
      "scene_layer": "background",
      "frame_position": "top",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_001",
      "module": "environment",
      "field_path": "setting",
      "claim": "setting",
      "value": "stadium",
      "supporting_observation_ids": [
        "obs_large_brown_wooden_structure_001",
        "obs_stadium_architecture_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_002",
      "module": "environment",
      "field_path": "sky",
      "claim": "sky",
      "value": "blue sky",
      "supporting_observation_ids": [
        "obs_blue_sky_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_003",
      "module": "environment",
      "field_path": "sky",
      "claim": "sky",
      "value": "white clouds",
      "supporting_observation_ids": [
        "obs_white_clouds_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "environment",
      "field_path": "plants",
      "claim": "plants",
      "value": "tall green trees",
      "supporting_observation_ids": [
        "obs_tall_green_trees_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_005",
      "module": "environment",
      "field_path": "ground",
      "claim": "ground",
      "value": "green grass field",
      "supporting_observation_ids": [
        "obs_green_grass_field_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_006",
      "module": "objects_and_props",
      "field_path": "objects_and_props",
      "claim": "object",
      "value": "brown wooden pathway",
      "supporting_observation_ids": [
        "obs_brown_wooden_pathway_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_007",
      "module": "objects_and_props",
      "field_path": "objects_and_props",
      "claim": "object",
      "value": "metal fence",
      "supporting_observation_ids": [
        "obs_metal_fence_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_008",
      "module": "objects_and_props",
      "field_path": "objects_and_props",
      "claim": "object",
      "value": "white and orange traffic cones",
      "supporting_observation_ids": [
        "obs_white_and_orange_traffic_cones_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_009",
      "module": "objects_and_props",
      "field_path": "objects_and_props",
      "claim": "object",
      "value": "purple and blue track",
      "supporting_observation_ids": [
        "obs_purple_and_blue_track_001"
      ],
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_010",
      "module": "environment",
      "field_path": "lighting",
      "claim": "lighting",
      "value": "sunlight lighting",
      "supporting_observation_ids": [
        "obs_sunlight_lighting_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [
    {
      "count_id": "count_001",
      "normalized_label": "traffic cones",
      "count_type": "exact",
      "exact_count": 6,
      "estimated_min": 0,
      "estimated_max": 0,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_white_and_orange_traffic_cones_001"
      ],
      "scene_layer": "foreground",
      "confidence": 0.95
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_brown_wooden_pathway_001",
      "obs_metal_fence_001",
      "obs_white_and_orange_traffic_cones_001"
    ],
    "midground": [
      "obs_green_circular_emblem_001",
      "obs_green_grass_field_001",
      "obs_large_brown_wooden_structure_001",
      "obs_purple_and_blue_track_001",
      "obs_stadium_architecture_001"
    ],
    "background": [
      "obs_blue_sky_001",
      "obs_tall_green_trees_001",
      "obs_white_clouds_001"
    ]
  },
  "environment": {
    "setting": [
      "stadium"
    ],
    "indoor_outdoor": "outdoor",
    "sky": [
      "blue sky",
      "white clouds"
    ],
    "ground": [
      "green grass field"
    ],
    "terrain": [],
    "plants": [
      "tall green trees"
    ],
    "architecture": [
      "large brown wooden structure",
      "stadium architecture"
    ],
    "water": [],
    "weather": [],
    "time_of_day_cues": [
      "sunlight lighting"
    ],
    "supporting_observation_ids": [
      "obs_blue_sky_001",
      "obs_green_grass_field_001",
      "obs_large_brown_wooden_structure_001",
      "obs_stadium_architecture_001",
      "obs_sunlight_lighting_001",
      "obs_tall_green_trees_001",
      "obs_white_clouds_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_brown_wooden_pathway_001",
      "label": "brown wooden pathway",
      "normalized_label": "brown wooden pathway",
      "object_type": "structure",
      "colors": [
        "brown"
      ],
      "material_appearance": [
        "wood-like appearance"
      ],
      "location": "foreground",
      "count_reference": "",
      "confidence": 0.95
    },
    {
      "observation_id": "obs_metal_fence_001",
      "label": "metal fence",
      "normalized_label": "metal fence",
      "object_type": "barrier",
      "colors": [
        "black"
      ],
      "material_appearance": [
        "metallic"
      ],
      "location": "foreground",
      "count_reference": "",
      "confidence": 0.95
    },
    {
      "observation_id": "obs_white_and_orange_traffic_cones_001",
      "label": "white and orange traffic cones",
      "normalized_label": "traffic cones",
      "object_type": "traffic cones",
      "colors": [
        "orange",
        "white"
      ],
      "material_appearance": [
        "plastic-like appearance"
      ],
      "location": "foreground",
      "count_reference": "count_001",
      "confidence": 0.95
    },
    {
      "observation_id": "obs_purple_and_blue_track_001",
      "label": "purple and blue track",
      "normalized_label": "purple and blue track",
      "object_type": "track",
      "colors": [
        "blue",
        "purple"
      ],
      "material_appearance": [
        "painted surface"
      ],
      "location": "midground",
      "count_reference": "",
      "confidence": 0.94
    }
  ],
  "relationships": [],
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
      "sunlight"
    ],
    "shadows": [
      "soft"
    ],
    "highlights": [
      "natural"
    ],
    "composition": [
      "background sky and trees",
      "central focus on stadium architecture",
      "foreground pathway and fence"
    ],
    "camera_angle": "eye-level",
    "framing": "wide",
    "cropping": [],
    "depth": "deep",
    "motion_cues": [],
    "motifs": [
      "sports",
      "stadium"
    ],
    "repeated_shapes": [
      "circular emblem",
      "traffic cones repeating"
    ],
    "style_cues": [
      "naturalistic painting style"
    ],
    "supporting_observation_ids": [
      "obs_blue_sky_001",
      "obs_brown_wooden_pathway_001",
      "obs_metal_fence_001",
      "obs_purple_and_blue_track_001",
      "obs_stadium_architecture_001",
      "obs_sunlight_lighting_001",
      "obs_tall_green_trees_001",
      "obs_white_and_orange_traffic_cones_001"
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
        "fact_006",
        "fact_007",
        "fact_008",
        "fact_009"
      ],
      "object_observation_ids": [
        "obs_brown_wooden_pathway_001",
        "obs_metal_fence_001",
        "obs_purple_and_blue_track_001",
        "obs_white_and_orange_traffic_cones_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_001",
        "fact_002",
        "fact_003",
        "fact_004",
        "fact_005",
        "fact_010"
      ],
      "observation_ids": [
        "obs_blue_sky_001",
        "obs_green_grass_field_001",
        "obs_large_brown_wooden_structure_001",
        "obs_stadium_architecture_001",
        "obs_sunlight_lighting_001",
        "obs_tall_green_trees_001",
        "obs_white_clouds_001"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": []
    },
    "color_and_light": {
      "fact_ids": [
        "fact_010"
      ],
      "observation_ids": [
        "obs_sunlight_lighting_001"
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
        "fact_011"
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
        "stadium architecture",
        "large brown wooden structure",
        "green circular emblem",
        "blue sky",
        "white clouds",
        "green grass field",
        "tall green trees",
        "brown wooden pathway"
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
      "review_status": "partial_due_to_low_resolution",
      "omission_risk": "medium",
      "evidence_quality": "medium",
      "abstentions": [
        {
          "field_path": "name_text_observation_ids",
          "reason": "text partly low resolution or unclear",
          "affected_observation_ids": []
        },
        {
          "field_path": "collector_number_observation_ids",
          "reason": "text partly low resolution or unclear",
          "affected_observation_ids": []
        },
        {
          "field_path": "set_symbol_observation_ids",
          "reason": "text partly low resolution or unclear",
          "affected_observation_ids": []
        },
        {
          "field_path": "rarity_mark_observation_ids",
          "reason": "text partly low resolution or unclear",
          "affected_observation_ids": []
        },
        {
          "field_path": "copyright_line_observation_ids",
          "reason": "text partly low resolution or unclear",
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
      "term": "stadium architecture",
      "supporting_observation_ids": [
        "obs_stadium_architecture_001"
      ]
    },
    {
      "term": "large brown wooden structure",
      "supporting_observation_ids": [
        "obs_large_brown_wooden_structure_001"
      ]
    },
    {
      "term": "green circular emblem",
      "supporting_observation_ids": [
        "obs_green_circular_emblem_001"
      ]
    },
    {
      "term": "blue sky",
      "supporting_observation_ids": [
        "obs_blue_sky_001"
      ]
    },
    {
      "term": "white clouds",
      "supporting_observation_ids": [
        "obs_white_clouds_001"
      ]
    },
    {
      "term": "green grass field",
      "supporting_observation_ids": [
        "obs_green_grass_field_001"
      ]
    },
    {
      "term": "tall green trees",
      "supporting_observation_ids": [
        "obs_tall_green_trees_001"
      ]
    },
    {
      "term": "brown wooden pathway",
      "supporting_observation_ids": [
        "obs_brown_wooden_pathway_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "building",
        "source_observation_ids": [
          "obs_large_brown_wooden_structure_001",
          "obs_stadium_architecture_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "centered composition",
        "source_observation_ids": [
          "obs_stadium_architecture_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "circular motif",
        "source_observation_ids": [
          "obs_green_circular_emblem_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.9
      },
      {
        "concept": "cloud",
        "source_observation_ids": [
          "obs_white_clouds_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "fence",
        "source_observation_ids": [
          "obs_metal_fence_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "sky",
        "source_observation_ids": [
          "obs_blue_sky_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "terrain",
        "source_observation_ids": [
          "obs_green_grass_field_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "tree",
        "source_observation_ids": [
          "obs_tall_green_trees_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
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
- Attribute confidence: `0.95`
- Cost USD: `0.008298`
- Artwork observations: `13`
- Card UI / print-marker observations: `0`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. No confident visible fact observations were extracted.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| indoor environment | indoor environment | environment | background | salient | 0.99 |
| pool of bright orange molten lava | pool of bright orange molten lava | environment | midground | salient | 0.98 |
| lava falling in waterfall stream | lava waterfall stream | environment | midground | salient | 0.97 |
| massive stone walls | massive stone walls | environment | background | salient | 0.95 |
| indoors with rocky cave appearance | rocky cave indoors | environment | background | salient | 0.96 |
| large triangular platform | triangular platform | object | midground | salient | 0.98 |
| black and red patterned surface on platform | black and red patterned platform surface | object | midground | salient | 0.96 |
| white circular symbol on platform surface | white circular symbol on platform | object | midground | salient | 0.95 |
| metallic chain attached to platform corner | metallic chain on platform corner | object | midground | salient | 0.94 |
| molten lava surrounding platform | molten lava surrounding platform | environment | midground | salient | 0.97 |
| dominant orange and red color palette | orange and red color palette | color_and_light | midground | salient | 0.98 |
| dark black on platform surface | black color on platform | color_and_light | midground | salient | 0.95 |
| bright glowing light from lava | bright glowing lava light | color_and_light | midground | salient | 0.97 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| none recorded | | | | |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_env_001 | environment | setting | obs_environment_001 | 0.99 |
| fact_env_002 | environment | terrain | obs_environment_002, obs_environment_006 | 0.98 |
| fact_env_003 | environment | terrain | obs_environment_003 | 0.97 |
| fact_env_004 | environment | architecture | obs_environment_004, obs_environment_005 | 0.95 |
| fact_obj_001 | objects_and_props | object | obs_objects_props_001 | 0.98 |
| fact_obj_002 | objects_and_props | platform surface colors and pattern | obs_objects_props_002, obs_objects_props_003 | 0.96 |
| fact_obj_003 | objects_and_props | object | obs_objects_props_004 | 0.94 |
| fact_color_001 | color_and_light | dominant color palette | obs_palette_001, obs_palette_002 | 0.96 |
| fact_light_001 | color_and_light | lighting source | obs_lighting_001 | 0.97 |

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
| composition | partial_due_to_crop | medium | medium |  |
| color_and_light | complete | low | high |  |
| visual_effects | none_visible | none | high |  |
| card_ui_and_print_markers | none_visible | none | high |  |
| counts | none_visible | none | high |  |
| relationships | none_visible | none | high |  |
| surface_and_scan_cues | none_visible | none | high |  |
| uncertainty_and_abstentions | not_applicable | none | not_applicable |  |
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
| indoor environment | obs_environment_001 |
| pool of bright orange molten lava | obs_environment_002 |
| lava waterfall stream | obs_environment_003 |
| massive stone walls | obs_environment_004 |
| rocky cave indoors | obs_environment_005 |
| triangular platform | obs_objects_props_001 |
| black and red patterned platform surface | obs_objects_props_002 |
| white circular symbol on platform | obs_objects_props_003 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| centered composition | obs_objects_props_001 | deterministic_rule | 0.92 |
| circular motif | obs_objects_props_003 | deterministic_rule | 0.95 |
| glowing highlights | obs_lighting_001 | deterministic_rule | 0.97 |
| metal-like appearance | obs_objects_props_004 | deterministic_rule | 0.94 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. No confident visible fact observations were extracted.
- Quality flags: `potential_count_reference_inconsistent`, `potential_module_incomplete_or_low_evidence`, `potential_module_review_conflicts_with_entries`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "indoor environment",
      "normalized_label": "indoor environment",
      "scene_layer": "background",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_002",
      "kind": "environment",
      "label": "pool of bright orange molten lava",
      "normalized_label": "pool of bright orange molten lava",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_003",
      "kind": "environment",
      "label": "lava falling in waterfall stream",
      "normalized_label": "lava waterfall stream",
      "scene_layer": "midground",
      "frame_position": "top center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_004",
      "kind": "environment",
      "label": "massive stone walls",
      "normalized_label": "massive stone walls",
      "scene_layer": "background",
      "frame_position": "surrounding",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_005",
      "kind": "environment",
      "label": "indoors with rocky cave appearance",
      "normalized_label": "rocky cave indoors",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_objects_props_001",
      "kind": "object",
      "label": "large triangular platform",
      "normalized_label": "triangular platform",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_objects_props_002",
      "kind": "object",
      "label": "black and red patterned surface on platform",
      "normalized_label": "black and red patterned platform surface",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_objects_props_003",
      "kind": "object",
      "label": "white circular symbol on platform surface",
      "normalized_label": "white circular symbol on platform",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_objects_props_004",
      "kind": "object",
      "label": "metallic chain attached to platform corner",
      "normalized_label": "metallic chain on platform corner",
      "scene_layer": "midground",
      "frame_position": "front right corner",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_006",
      "kind": "environment",
      "label": "molten lava surrounding platform",
      "normalized_label": "molten lava surrounding platform",
      "scene_layer": "midground",
      "frame_position": "foreground and background",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_palette_001",
      "kind": "color_and_light",
      "label": "dominant orange and red color palette",
      "normalized_label": "orange and red color palette",
      "scene_layer": "midground",
      "frame_position": "overall",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_palette_002",
      "kind": "color_and_light",
      "label": "dark black on platform surface",
      "normalized_label": "black color on platform",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_lighting_001",
      "kind": "color_and_light",
      "label": "bright glowing light from lava",
      "normalized_label": "bright glowing lava light",
      "scene_layer": "midground",
      "frame_position": "overall",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.97,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_env_001",
      "module": "environment",
      "field_path": "setting",
      "claim": "setting",
      "value": "indoor",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_002",
      "module": "environment",
      "field_path": "terrain",
      "claim": "terrain",
      "value": "molten lava pool",
      "supporting_observation_ids": [
        "obs_environment_002",
        "obs_environment_006"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_003",
      "module": "environment",
      "field_path": "terrain",
      "claim": "terrain",
      "value": "lava waterfall stream",
      "supporting_observation_ids": [
        "obs_environment_003"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_004",
      "module": "environment",
      "field_path": "architecture",
      "claim": "architecture",
      "value": "massive stone cave walls",
      "supporting_observation_ids": [
        "obs_environment_004",
        "obs_environment_005"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_001",
      "module": "objects_and_props",
      "field_path": "label",
      "claim": "object",
      "value": "triangular platform",
      "supporting_observation_ids": [
        "obs_objects_props_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_002",
      "module": "objects_and_props",
      "field_path": "surface_and_pattern",
      "claim": "platform surface colors and pattern",
      "value": "black and red patterned with white circular symbol",
      "supporting_observation_ids": [
        "obs_objects_props_002",
        "obs_objects_props_003"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_003",
      "module": "objects_and_props",
      "field_path": "label",
      "claim": "object",
      "value": "metallic chain attached to platform corner",
      "supporting_observation_ids": [
        "obs_objects_props_004"
      ],
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_color_001",
      "module": "color_and_light",
      "field_path": "palette",
      "claim": "dominant color palette",
      "value": "orange and red with black accents",
      "supporting_observation_ids": [
        "obs_palette_001",
        "obs_palette_002"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_light_001",
      "module": "color_and_light",
      "field_path": "lighting",
      "claim": "lighting source",
      "value": "bright glowing light from lava",
      "supporting_observation_ids": [
        "obs_lighting_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [],
  "scene_layers": {
    "foreground": [],
    "midground": [
      "obs_environment_002",
      "obs_environment_003",
      "obs_environment_006",
      "obs_objects_props_001",
      "obs_objects_props_002",
      "obs_objects_props_003",
      "obs_objects_props_004"
    ],
    "background": [
      "obs_environment_001",
      "obs_environment_004",
      "obs_environment_005"
    ]
  },
  "environment": {
    "setting": [
      "indoor"
    ],
    "indoor_outdoor": "indoor",
    "sky": [],
    "ground": [
      "lava waterfall stream",
      "molten lava pool"
    ],
    "terrain": [
      "lava waterfall stream",
      "massive stone cave walls",
      "molten lava pool",
      "rocky cave indoors"
    ],
    "plants": [],
    "architecture": [
      "massive stone cave walls"
    ],
    "water": [],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_environment_001",
      "obs_environment_002",
      "obs_environment_003",
      "obs_environment_004",
      "obs_environment_005",
      "obs_environment_006"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_objects_props_001",
      "label": "triangular platform",
      "normalized_label": "triangular platform",
      "object_type": "platform",
      "colors": [
        "black",
        "red",
        "white"
      ],
      "material_appearance": [
        "matte",
        "solid"
      ],
      "location": "midground center",
      "count_reference": "count_platform_001",
      "confidence": 0.98
    },
    {
      "observation_id": "obs_objects_props_002",
      "label": "pattern on platform surface",
      "normalized_label": "platform pattern",
      "object_type": "surface pattern",
      "colors": [
        "black",
        "red"
      ],
      "material_appearance": [
        "matte surface"
      ],
      "location": "on platform",
      "count_reference": "count_platform_001",
      "confidence": 0.96
    },
    {
      "observation_id": "obs_objects_props_003",
      "label": "white circular symbol on platform",
      "normalized_label": "white circular symbol",
      "object_type": "symbol",
      "colors": [
        "white"
      ],
      "material_appearance": [
        "painted"
      ],
      "location": "top of platform",
      "count_reference": "count_platform_001",
      "confidence": 0.95
    },
    {
      "observation_id": "obs_objects_props_004",
      "label": "metallic chain at platform corner",
      "normalized_label": "metallic chain",
      "object_type": "chain",
      "colors": [
        "metallic gray"
      ],
      "material_appearance": [
        "metallic"
      ],
      "location": "front right corner of platform",
      "count_reference": "count_chain_001",
      "confidence": 0.94
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "metallic gray",
      "orange",
      "red",
      "white"
    ],
    "lighting": [
      "bright glow from lava"
    ],
    "shadows": [
      "soft shadows on platform edges"
    ],
    "highlights": [
      "reflections on metallic chain"
    ],
    "composition": [
      "central triangular platform with lava surrounding"
    ],
    "camera_angle": "slightly elevated front angle",
    "framing": "tight framing focusing on platform center",
    "cropping": [],
    "depth": "moderate depth with foreground and background elements",
    "motion_cues": [
      "lava waterfall stream motion"
    ],
    "motifs": [
      "molten rock",
      "volcanic lava"
    ],
    "repeated_shapes": [
      "triangular platform shape"
    ],
    "style_cues": [
      "detailed textures",
      "realistic lighting"
    ],
    "supporting_observation_ids": [
      "obs_environment_002",
      "obs_environment_003",
      "obs_lighting_001",
      "obs_objects_props_001",
      "obs_objects_props_004",
      "obs_palette_001",
      "obs_palette_002"
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
        "fact_obj_001",
        "fact_obj_002",
        "fact_obj_003"
      ],
      "object_observation_ids": [
        "obs_objects_props_001",
        "obs_objects_props_002",
        "obs_objects_props_003",
        "obs_objects_props_004"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_env_001",
        "fact_env_002",
        "fact_env_003",
        "fact_env_004"
      ],
      "observation_ids": [
        "obs_environment_001",
        "obs_environment_002",
        "obs_environment_003",
        "obs_environment_004",
        "obs_environment_005",
        "obs_environment_006"
      ]
    },
    "composition": {
      "fact_ids": [
        "fact_light_001"
      ],
      "observation_ids": [
        "obs_lighting_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [
        "fact_color_001",
        "fact_light_001"
      ],
      "observation_ids": [
        "obs_lighting_001",
        "obs_palette_001",
        "obs_palette_002"
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
        "indoor environment",
        "pool of bright orange molten lava",
        "lava waterfall stream",
        "massive stone walls",
        "rocky cave indoors",
        "triangular platform",
        "black and red patterned platform surface",
        "white circular symbol on platform"
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
      "review_status": "not_applicable",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
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
      "term": "indoor environment",
      "supporting_observation_ids": [
        "obs_environment_001"
      ]
    },
    {
      "term": "pool of bright orange molten lava",
      "supporting_observation_ids": [
        "obs_environment_002"
      ]
    },
    {
      "term": "lava waterfall stream",
      "supporting_observation_ids": [
        "obs_environment_003"
      ]
    },
    {
      "term": "massive stone walls",
      "supporting_observation_ids": [
        "obs_environment_004"
      ]
    },
    {
      "term": "rocky cave indoors",
      "supporting_observation_ids": [
        "obs_environment_005"
      ]
    },
    {
      "term": "triangular platform",
      "supporting_observation_ids": [
        "obs_objects_props_001"
      ]
    },
    {
      "term": "black and red patterned platform surface",
      "supporting_observation_ids": [
        "obs_objects_props_002"
      ]
    },
    {
      "term": "white circular symbol on platform",
      "supporting_observation_ids": [
        "obs_objects_props_003"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "centered composition",
        "source_observation_ids": [
          "obs_objects_props_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "circular motif",
        "source_observation_ids": [
          "obs_objects_props_003"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "glowing highlights",
        "source_observation_ids": [
          "obs_lighting_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
      },
      {
        "concept": "metal-like appearance",
        "source_observation_ids": [
          "obs_objects_props_004"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.94
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-TCGCOLLECTOR11525-019 - High Pressure System

- Branch: `stadium`
- Review status: `needs_review`
- Description confidence: `0.95`
- Attribute confidence: `0.95`
- Cost USD: `0.0061292`
- Artwork observations: `9`
- Card UI / print-marker observations: `0`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. Visible observations: sky with clouds and sun, sun, white clouds, light beams, palm trees, rocky terrain with grass mound, grass mound, stone steps.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| sky with clouds and sun | sky with clouds and sun | sky | background | high | 0.99 |
| sun or bright circular light source | sun | object | background | high | 0.98 |
| white clouds scattered in sky | white clouds | object | background | medium | 0.98 |
| purple and white streaked light beams | light beams | object | background | medium | 0.95 |
| tall green palm trees | palm trees | object | midground | high | 0.99 |
| rocky terrain with grass mound | rocky terrain with grass mound | terrain | foreground | high | 0.98 |
| circular green grass mound with symbol | grass mound | object | foreground | high | 0.98 |
| stone steps leading to grass mound | stone steps | object | foreground | medium | 0.95 |
| wooden fence in distance | wooden fence | object | background | low | 0.9 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| none recorded | | | | |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_env_001 | environment | The sky is visible with white clouds and a sun-like light source | obs_clouds_001, obs_sky_001, obs_sun_001 | 0.99 |
| fact_env_002 | environment | There are purple and white streaked light beams in the sky | obs_light_beams_001 | 0.95 |
| fact_env_003 | environment | Palm trees are present on the left and right sides of the scene | obs_trees_001 | 0.99 |
| fact_env_004 | environment | The foreground has rocky terrain with a green grass mound having a symbol on it | obs_grass_mound_001, obs_ground_001 | 0.98 |
| fact_env_005 | environment | Stone steps lead up to the grass mound in the foreground | obs_stairs_001 | 0.95 |
| fact_env_006 | environment | A wooden fence is visible in the distance near the horizon | obs_fence_001 | 0.9 |

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
| visual_effects | complete | low | high |  |
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
| sky with clouds and sun | obs_sky_001 |
| sun | obs_sun_001 |
| white clouds | obs_clouds_001 |
| light beams | obs_light_beams_001 |
| palm trees | obs_trees_001 |
| rocky terrain with grass mound | obs_ground_001 |
| grass mound | obs_grass_mound_001 |
| stone steps | obs_stairs_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| centered composition | obs_grass_mound_001 | deterministic_rule | 0.92 |
| circular motif | obs_grass_mound_001, obs_ground_001, obs_stairs_001 | deterministic_rule | 0.92 |
| cloud | obs_clouds_001, obs_sky_001 | deterministic_rule | 0.99 |
| fence | obs_fence_001 | deterministic_rule | 0.9 |
| sky | obs_sky_001 | deterministic_rule | 0.99 |
| stairs | obs_stairs_001 | deterministic_rule | 0.95 |
| terrain | obs_grass_mound_001, obs_ground_001 | deterministic_rule | 0.98 |
| tree | obs_trees_001 | deterministic_rule | 0.99 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: sky with clouds and sun, sun, white clouds, light beams, palm trees, rocky terrain with grass mound, grass mound, stone steps.
- Quality flags: `potential_module_review_conflicts_with_entries`, `potential_salient_object_missing_count_reference`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_sky_001",
      "kind": "sky",
      "label": "sky with clouds and sun",
      "normalized_label": "sky with clouds and sun",
      "scene_layer": "background",
      "frame_position": "top center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_sun_001",
      "kind": "object",
      "label": "sun or bright circular light source",
      "normalized_label": "sun",
      "scene_layer": "background",
      "frame_position": "top center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clouds_001",
      "kind": "object",
      "label": "white clouds scattered in sky",
      "normalized_label": "white clouds",
      "scene_layer": "background",
      "frame_position": "top center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_light_beams_001",
      "kind": "object",
      "label": "purple and white streaked light beams",
      "normalized_label": "light beams",
      "scene_layer": "background",
      "frame_position": "top center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_trees_001",
      "kind": "object",
      "label": "tall green palm trees",
      "normalized_label": "palm trees",
      "scene_layer": "midground",
      "frame_position": "left and right sides",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_ground_001",
      "kind": "terrain",
      "label": "rocky terrain with grass mound",
      "normalized_label": "rocky terrain with grass mound",
      "scene_layer": "foreground",
      "frame_position": "bottom center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_grass_mound_001",
      "kind": "object",
      "label": "circular green grass mound with symbol",
      "normalized_label": "grass mound",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_stairs_001",
      "kind": "object",
      "label": "stone steps leading to grass mound",
      "normalized_label": "stone steps",
      "scene_layer": "foreground",
      "frame_position": "bottom center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_fence_001",
      "kind": "object",
      "label": "wooden fence in distance",
      "normalized_label": "wooden fence",
      "scene_layer": "background",
      "frame_position": "horizon",
      "visibility": "partially_occluded",
      "salience": "low",
      "confidence": 0.9,
      "evidence_strength": "moderate"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_env_001",
      "module": "environment",
      "field_path": "sky",
      "claim": "The sky is visible with white clouds and a sun-like light source",
      "value": "sky with white clouds and sun",
      "supporting_observation_ids": [
        "obs_clouds_001",
        "obs_sky_001",
        "obs_sun_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_002",
      "module": "environment",
      "field_path": "light_bands",
      "claim": "There are purple and white streaked light beams in the sky",
      "value": "purple and white light beams",
      "supporting_observation_ids": [
        "obs_light_beams_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_003",
      "module": "environment",
      "field_path": "plants",
      "claim": "Palm trees are present on the left and right sides of the scene",
      "value": "palm trees",
      "supporting_observation_ids": [
        "obs_trees_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_004",
      "module": "environment",
      "field_path": "terrain",
      "claim": "The foreground has rocky terrain with a green grass mound having a symbol on it",
      "value": "rocky terrain with grass mound",
      "supporting_observation_ids": [
        "obs_grass_mound_001",
        "obs_ground_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_005",
      "module": "environment",
      "field_path": "objects_and_props",
      "claim": "Stone steps lead up to the grass mound in the foreground",
      "value": "stone steps",
      "supporting_observation_ids": [
        "obs_stairs_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_006",
      "module": "environment",
      "field_path": "architecture",
      "claim": "A wooden fence is visible in the distance near the horizon",
      "value": "wooden fence",
      "supporting_observation_ids": [
        "obs_fence_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "moderate"
    }
  ],
  "subjects": [],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [],
  "scene_layers": {
    "foreground": [
      "obs_grass_mound_001",
      "obs_ground_001",
      "obs_stairs_001"
    ],
    "midground": [
      "obs_trees_001"
    ],
    "background": [
      "obs_clouds_001",
      "obs_fence_001",
      "obs_light_beams_001",
      "obs_sky_001",
      "obs_sun_001"
    ]
  },
  "environment": {
    "setting": [
      "outdoor garden or courtyard"
    ],
    "indoor_outdoor": "outdoor",
    "sky": [
      "cloudy sky",
      "sun visible"
    ],
    "ground": [
      "grass mound",
      "rocky ground"
    ],
    "terrain": [
      "rocky terrain"
    ],
    "plants": [
      "palm tree"
    ],
    "architecture": [
      "wooden fence"
    ],
    "water": [],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_clouds_001",
      "obs_fence_001",
      "obs_grass_mound_001",
      "obs_ground_001",
      "obs_sky_001",
      "obs_stairs_001",
      "obs_sun_001",
      "obs_trees_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_grass_mound_001",
      "label": "green grass mound with symbol",
      "normalized_label": "grass mound",
      "object_type": "terrain feature",
      "colors": [
        "green"
      ],
      "material_appearance": [
        "natural",
        "plant"
      ],
      "location": "center foreground",
      "count_reference": "",
      "confidence": 0.98
    },
    {
      "observation_id": "obs_stairs_001",
      "label": "stone steps",
      "normalized_label": "stone steps",
      "object_type": "architecture element",
      "colors": [
        "gray"
      ],
      "material_appearance": [
        "stone-like appearance"
      ],
      "location": "foreground",
      "count_reference": "",
      "confidence": 0.95
    },
    {
      "observation_id": "obs_fence_001",
      "label": "wooden fence",
      "normalized_label": "wooden fence",
      "object_type": "architecture element",
      "colors": [
        "brown"
      ],
      "material_appearance": [
        "wood-like appearance"
      ],
      "location": "background horizon",
      "count_reference": "",
      "confidence": 0.9
    }
  ],
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
      "bright lighting from upper left"
    ],
    "shadows": [
      "soft shadows from trees and mound"
    ],
    "highlights": [
      "sun reflection on grass"
    ],
    "composition": [
      "central circular mound",
      "leading lines of stairs",
      "symmetric palm trees"
    ],
    "camera_angle": "slight low angle",
    "framing": "natural scene framed by trees",
    "cropping": [
      "full card art visible"
    ],
    "depth": "deep depth with layers foreground to background",
    "motion_cues": [],
    "motifs": [
      "circular symbol on grass mound"
    ],
    "repeated_shapes": [
      "repeated palm tree leaves shape"
    ],
    "style_cues": [
      "painterly modern"
    ],
    "supporting_observation_ids": [
      "obs_clouds_001",
      "obs_fence_001",
      "obs_grass_mound_001",
      "obs_ground_001",
      "obs_light_beams_001",
      "obs_sky_001",
      "obs_stairs_001",
      "obs_sun_001",
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
        "fact_env_004",
        "fact_env_005",
        "fact_env_006"
      ],
      "object_observation_ids": [
        "obs_fence_001",
        "obs_grass_mound_001",
        "obs_stairs_001"
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
        "obs_clouds_001",
        "obs_fence_001",
        "obs_grass_mound_001",
        "obs_ground_001",
        "obs_light_beams_001",
        "obs_sky_001",
        "obs_stairs_001",
        "obs_sun_001",
        "obs_trees_001"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_grass_mound_001",
        "obs_stairs_001",
        "obs_trees_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_light_beams_001",
        "obs_sun_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": [
        "obs_light_beams_001"
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
        "sky with clouds and sun",
        "sun",
        "white clouds",
        "light beams",
        "palm trees",
        "rocky terrain with grass mound",
        "grass mound",
        "stone steps"
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
      "term": "sky with clouds and sun",
      "supporting_observation_ids": [
        "obs_sky_001"
      ]
    },
    {
      "term": "sun",
      "supporting_observation_ids": [
        "obs_sun_001"
      ]
    },
    {
      "term": "white clouds",
      "supporting_observation_ids": [
        "obs_clouds_001"
      ]
    },
    {
      "term": "light beams",
      "supporting_observation_ids": [
        "obs_light_beams_001"
      ]
    },
    {
      "term": "palm trees",
      "supporting_observation_ids": [
        "obs_trees_001"
      ]
    },
    {
      "term": "rocky terrain with grass mound",
      "supporting_observation_ids": [
        "obs_ground_001"
      ]
    },
    {
      "term": "grass mound",
      "supporting_observation_ids": [
        "obs_grass_mound_001"
      ]
    },
    {
      "term": "stone steps",
      "supporting_observation_ids": [
        "obs_stairs_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "centered composition",
        "source_observation_ids": [
          "obs_grass_mound_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "circular motif",
        "source_observation_ids": [
          "obs_grass_mound_001",
          "obs_ground_001",
          "obs_stairs_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "cloud",
        "source_observation_ids": [
          "obs_clouds_001",
          "obs_sky_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "fence",
        "source_observation_ids": [
          "obs_fence_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.9
      },
      {
        "concept": "sky",
        "source_observation_ids": [
          "obs_sky_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "stairs",
        "source_observation_ids": [
          "obs_stairs_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "terrain",
        "source_observation_ids": [
          "obs_grass_mound_001",
          "obs_ground_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "tree",
        "source_observation_ids": [
          "obs_trees_001"
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
- Description confidence: `0.98`
- Attribute confidence: `0.95`
- Cost USD: `0.0082108`
- Artwork observations: `8`
- Card UI / print-marker observations: `5`
- Card UI module evidence references: `3`
- Derived digest: Fact digest. Counts: bomb: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| bomb | bomb | object | foreground | primary | 0.99 |
| bomb body | bomb body | object | foreground | primary_part | 0.98 |
| black and yellow striped bomb body | black yellow striped bomb body | object | foreground | primary_part_color | 0.98 |
| red fuse with lit spark | red fuse with lit spark | object | foreground | primary_part | 0.97 |
| lit spark at fuse tip | lit spark fuse tip | object | foreground | detail | 0.96 |
| bright highlight on bomb body | bright highlight bomb body | object | foreground | detail | 0.95 |
| white outline edges on bomb panels | white outline edges bomb panels | object | foreground | detail | 0.95 |
| radiant orange, red, blue background radiating outward | radiant orange red blue background | object | background | background | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text in Japanese | card_ui_text | top-left | visible | 0.99 |
| Pokémon Tool and Trainers labels in Japanese | card_ui_text | top | visible | 0.98 |
| Japanese descriptive and effect text in mid and lower card area | card_ui_text | middle-lower | visible | 0.97 |
| illustrator text 'illose yukie' | illustrator_text | bottom-left | visible | 0.95 |
| set code 'J M5' and card number '106/081 SR' | card_ui_text | bottom-left | visible | 0.98 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_bomb_subject_001 | objects_and_props | object label | obs_bomb_001 | 0.99 |
| fact_bomb_color_001 | objects_and_props | bomb body color pattern | obs_bomb_body_color_001 | 0.98 |
| fact_bomb_fuse_001 | objects_and_props | red fuse with lit spark | obs_bomb_fuse_001, obs_bomb_fuse_spark_001 | 0.97 |
| fact_background_001 | environment | background colors and pattern | obs_background_colors_001 | 0.95 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_name_001 | card name text visible | obs_card_ui_name_text_001 | 0.99 |
| fact_card_ui_illustrator_001 | illustrator text visible | obs_card_ui_illustrator_text_001 | 0.95 |
| fact_card_ui_set_code_001 | set code and card number visible | obs_card_ui_set_code_001 | 0.98 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_illustrator_001",
    "fact_card_ui_name_001",
    "fact_card_ui_set_code_001"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_name_text_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [],
  "set_symbol_observation_ids": [],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [],
  "bottom_line_text_observation_ids": [
    "obs_card_ui_set_code_001"
  ],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_card_ui_illustrator_text_001"
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
| composition | likely_complete | low | high |  |
| color_and_light | likely_complete | low | high |  |
| visual_effects | likely_complete | low | high |  |
| card_ui_and_print_markers | complete | low | high |  |
| counts | complete | none | high |  |
| relationships | none_visible | none | high |  |
| surface_and_scan_cues | none_visible | none | high |  |
| uncertainty_and_abstentions | not_applicable | none | high |  |
| fact_grounded_search_terms | none_visible | none | high |  |

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
| radiant orange red blue background | obs_background_colors_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| centered composition | obs_bomb_001 | deterministic_rule | 0.92 |
| glowing highlights | obs_bomb_highlight_001 | deterministic_rule | 0.95 |
| spark | obs_bomb_fuse_001, obs_bomb_fuse_spark_001 | deterministic_rule | 0.97 |

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
      "salience": "primary",
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
      "salience": "primary_part",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bomb_body_color_001",
      "kind": "object",
      "label": "black and yellow striped bomb body",
      "normalized_label": "black yellow striped bomb body",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary_part_color",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bomb_fuse_001",
      "kind": "object",
      "label": "red fuse with lit spark",
      "normalized_label": "red fuse with lit spark",
      "scene_layer": "foreground",
      "frame_position": "top-center",
      "visibility": "visible",
      "salience": "primary_part",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bomb_fuse_spark_001",
      "kind": "object",
      "label": "lit spark at fuse tip",
      "normalized_label": "lit spark fuse tip",
      "scene_layer": "foreground",
      "frame_position": "top-center",
      "visibility": "visible",
      "salience": "detail",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bomb_highlight_001",
      "kind": "object",
      "label": "bright highlight on bomb body",
      "normalized_label": "bright highlight bomb body",
      "scene_layer": "foreground",
      "frame_position": "center-right",
      "visibility": "visible",
      "salience": "detail",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bomb_outline_001",
      "kind": "object",
      "label": "white outline edges on bomb panels",
      "normalized_label": "white outline edges bomb panels",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "detail",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_background_colors_001",
      "kind": "object",
      "label": "radiant orange, red, blue background radiating outward",
      "normalized_label": "radiant orange red blue background",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "background",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_text_001",
      "kind": "card_ui_text",
      "label": "card name text in Japanese",
      "normalized_label": "card name text",
      "scene_layer": "ui_layer",
      "frame_position": "top-left",
      "visibility": "visible",
      "salience": "ui",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_subheader_001",
      "kind": "card_ui_text",
      "label": "Pokémon Tool and Trainers labels in Japanese",
      "normalized_label": "card subheader text",
      "scene_layer": "ui_layer",
      "frame_position": "top",
      "visibility": "visible",
      "salience": "ui",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_japanese_text_001",
      "kind": "card_ui_text",
      "label": "Japanese descriptive and effect text in mid and lower card area",
      "normalized_label": "card effect text",
      "scene_layer": "ui_layer",
      "frame_position": "middle-lower",
      "visibility": "visible",
      "salience": "ui",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_illustrator_text_001",
      "kind": "illustrator_text",
      "label": "illustrator text 'illose yukie'",
      "normalized_label": "illustrator text",
      "scene_layer": "ui_layer",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "ui",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_code_001",
      "kind": "card_ui_text",
      "label": "set code 'J M5' and card number '106/081 SR'",
      "normalized_label": "set code and number",
      "scene_layer": "ui_layer",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "ui",
      "confidence": 0.98,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_bomb_subject_001",
      "module": "objects_and_props",
      "field_path": "[0]",
      "claim": "object label",
      "value": "bomb",
      "supporting_observation_ids": [
        "obs_bomb_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_bomb_color_001",
      "module": "objects_and_props",
      "field_path": "[0].colors",
      "claim": "bomb body color pattern",
      "value": "black and yellow striped",
      "supporting_observation_ids": [
        "obs_bomb_body_color_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_bomb_fuse_001",
      "module": "objects_and_props",
      "field_path": "[0].fuse",
      "claim": "red fuse with lit spark",
      "value": "true",
      "supporting_observation_ids": [
        "obs_bomb_fuse_001",
        "obs_bomb_fuse_spark_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_background_001",
      "module": "environment",
      "field_path": "background",
      "claim": "background colors and pattern",
      "value": "radiant orange, red, blue radiating",
      "supporting_observation_ids": [
        "obs_background_colors_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_name_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text_observation_ids",
      "claim": "card name text visible",
      "value": "ごうかいボム (Tremendous Bomb in Japanese)",
      "supporting_observation_ids": [
        "obs_card_ui_name_text_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_illustrator_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text_observation_ids",
      "claim": "illustrator text visible",
      "value": "illose yukie",
      "supporting_observation_ids": [
        "obs_card_ui_illustrator_text_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_set_code_001",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text_observation_ids",
      "claim": "set code and card number visible",
      "value": "J M5 106/081 SR",
      "supporting_observation_ids": [
        "obs_card_ui_set_code_001"
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
      "count_id": "count_bomb_001",
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
      "obs_bomb_body_001",
      "obs_bomb_body_color_001",
      "obs_bomb_fuse_001",
      "obs_bomb_fuse_spark_001",
      "obs_bomb_highlight_001",
      "obs_bomb_outline_001"
    ],
    "midground": [],
    "background": [
      "obs_background_colors_001"
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
      "obs_background_colors_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_bomb_001",
      "label": "bomb",
      "normalized_label": "bomb",
      "object_type": "tool-like object",
      "colors": [
        "black",
        "red",
        "white",
        "yellow"
      ],
      "material_appearance": [
        "bright spark",
        "dark rounded body",
        "white highlights",
        "yellow stripe band"
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
      "white",
      "yellow"
    ],
    "lighting": [
      "bright spark highlight on fuse and bomb"
    ],
    "shadows": [
      "dark shading on bomb body"
    ],
    "highlights": [
      "white outline on panels"
    ],
    "composition": [
      "central bomb object",
      "radiant colorful background"
    ],
    "camera_angle": "straight-on",
    "framing": "tight framing around bomb",
    "cropping": [],
    "depth": "shallow depth",
    "motion_cues": [
      "radiant energy bursts"
    ],
    "motifs": [
      "circular bomb shape",
      "striped band pattern"
    ],
    "repeated_shapes": [
      "panel rectangles on bomb body"
    ],
    "style_cues": [
      "bold colorful gradients",
      "explosive background"
    ],
    "supporting_observation_ids": [
      "obs_background_colors_001",
      "obs_bomb_001"
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
        "fact_bomb_color_001",
        "fact_bomb_fuse_001",
        "fact_bomb_subject_001"
      ],
      "object_observation_ids": [
        "obs_bomb_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_background_001"
      ],
      "observation_ids": [
        "obs_background_colors_001"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_background_colors_001",
        "obs_bomb_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_bomb_highlight_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": [
        "obs_bomb_fuse_spark_001"
      ]
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_ui_illustrator_001",
        "fact_card_ui_name_001",
        "fact_card_ui_set_code_001"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_name_text_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [],
      "set_symbol_observation_ids": [],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [],
      "bottom_line_text_observation_ids": [
        "obs_card_ui_set_code_001"
      ],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_card_ui_illustrator_text_001"
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
        "radiant orange red blue background"
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
      "term": "bomb",
      "supporting_observation_ids": [
        "obs_bomb_001"
      ]
    },
    {
      "term": "radiant orange red blue background",
      "supporting_observation_ids": [
        "obs_background_colors_001"
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
          "obs_bomb_highlight_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "spark",
        "source_observation_ids": [
          "obs_bomb_fuse_001",
          "obs_bomb_fuse_spark_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-105 - Dark Bell

- Branch: `item_tool_supporter`
- Review status: `needs_review`
- Description confidence: `0.99`
- Attribute confidence: `0.98`
- Cost USD: `0.0086164`
- Artwork observations: `6`
- Card UI / print-marker observations: `6`
- Card UI module evidence references: `7`
- Derived digest: Fact digest. Visible observations: dark bell, bell handle, bell body, decorative pattern, glowing core, purple swirling background. Counts: dark bell: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| dark bell | dark bell | object | midground | high | 0.99 |
| bell handle | bell handle | object | midground | medium | 0.95 |
| bell body | bell body | object | midground | medium | 0.95 |
| decorative pattern | decorative pattern | object | midground | medium | 0.95 |
| glowing core | glowing core | object | midground | medium | 0.9 |
| purple swirling background | purple swirling background | visual_design | background | medium | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text in Japanese 'ダークベル' | card_ui_text | top-left | visible | 0.99 |
| text top right in Japanese 'トレーナーズ' | card_ui_text | top-right | visible | 0.99 |
| set number and rarity '105/081 SR' | card_ui_text | bottom-left | visible | 0.99 |
| illustrator text 'Illus. Toyste Beach' | card_ui_text | bottom-left | visible | 0.95 |
| copyright text '©2026 Pokémon/Nintendo/Creatures/GAME FREAK.' | card_ui_text | bottom | visible | 0.99 |
| Japanese text block in middle bottom | card_ui_text | bottom-center | visible | 0.95 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_obj_001 | objects_and_props | object | obs_object_001 | 0.99 |
| fact_obj_002 | objects_and_props | bell handle | obs_object_002 | 0.95 |
| fact_obj_003 | objects_and_props | bell body | obs_object_003 | 0.95 |
| fact_obj_004 | objects_and_props | decorative pattern on bell body | obs_object_004 | 0.95 |
| fact_obj_005 | objects_and_props | glowing core inside bell | obs_object_005 | 0.9 |
| fact_env_001 | environment | background style | obs_visual_design_001 | 0.95 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_ui_001 | card name text | obs_card_ui_text_001 | 0.99 |
| fact_ui_002 | top right text | obs_card_ui_text_002 | 0.99 |
| fact_ui_003 | collector number and rarity | obs_card_ui_text_003 | 0.99 |
| fact_ui_004 | illustrator | obs_card_ui_text_004 | 0.95 |
| fact_ui_005 | copyright line | obs_card_ui_text_005 | 0.99 |
| fact_ui_006 | bottom line text in Japanese | obs_card_ui_text_006 | 0.95 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_ui_001",
    "fact_ui_002",
    "fact_ui_003",
    "fact_ui_004",
    "fact_ui_005",
    "fact_ui_006"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_text_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_card_ui_text_003"
  ],
  "set_symbol_observation_ids": [],
  "rarity_mark_observation_ids": [
    "obs_card_ui_text_003"
  ],
  "copyright_line_observation_ids": [
    "obs_card_ui_text_005"
  ],
  "bottom_line_text_observation_ids": [
    "obs_card_ui_text_006"
  ],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_card_ui_text_004"
  ],
  "error_marker_observation_ids": [],
  "other_print_marker_observation_ids": [
    "obs_card_ui_text_002"
  ]
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
| uncertainty_and_abstentions | none_visible | none | high |  |
| fact_grounded_search_terms | complete | none | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| none recorded | | | | | | |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| dark bell | exact | 1 | obs_object_001 | 0.99 |

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
| bell handle | obs_object_002 |
| bell body | obs_object_003 |
| decorative pattern | obs_object_004 |
| glowing core | obs_object_005 |
| purple swirling background | obs_visual_design_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| glowing highlights | obs_object_005 | deterministic_rule | 0.9 |
| spiral motif | obs_visual_design_001 | deterministic_rule | 0.95 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: dark bell, bell handle, bell body, decorative pattern, glowing core, purple swirling background. Counts: dark bell: 1.
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
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_002",
      "kind": "object",
      "label": "bell handle",
      "normalized_label": "bell handle",
      "scene_layer": "midground",
      "frame_position": "top-left",
      "visibility": "visible",
      "salience": "medium",
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
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_004",
      "kind": "object",
      "label": "decorative pattern",
      "normalized_label": "decorative pattern",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_object_005",
      "kind": "object",
      "label": "glowing core",
      "normalized_label": "glowing core",
      "scene_layer": "midground",
      "frame_position": "center-front",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_visual_design_001",
      "kind": "visual_design",
      "label": "purple swirling background",
      "normalized_label": "purple swirling background",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_001",
      "kind": "card_ui_text",
      "label": "card name text in Japanese 'ダークベル'",
      "normalized_label": "card name text",
      "scene_layer": "ui",
      "frame_position": "top-left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_002",
      "kind": "card_ui_text",
      "label": "text top right in Japanese 'トレーナーズ'",
      "normalized_label": "card UI top right text",
      "scene_layer": "ui",
      "frame_position": "top-right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_003",
      "kind": "card_ui_text",
      "label": "set number and rarity '105/081 SR'",
      "normalized_label": "collector number and rarity",
      "scene_layer": "ui",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_004",
      "kind": "card_ui_text",
      "label": "illustrator text 'Illus. Toyste Beach'",
      "normalized_label": "illustrator text",
      "scene_layer": "ui",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_005",
      "kind": "card_ui_text",
      "label": "copyright text '©2026 Pokémon/Nintendo/Creatures/GAME FREAK.'",
      "normalized_label": "copyright line",
      "scene_layer": "ui",
      "frame_position": "bottom",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_006",
      "kind": "card_ui_text",
      "label": "Japanese text block in middle bottom",
      "normalized_label": "card description text",
      "scene_layer": "ui",
      "frame_position": "bottom-center",
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
      "field_path": "[0]",
      "claim": "object",
      "value": "dark bell",
      "supporting_observation_ids": [
        "obs_object_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_002",
      "module": "objects_and_props",
      "field_path": "[1]",
      "claim": "bell handle",
      "value": "present",
      "supporting_observation_ids": [
        "obs_object_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_003",
      "module": "objects_and_props",
      "field_path": "[2]",
      "claim": "bell body",
      "value": "present",
      "supporting_observation_ids": [
        "obs_object_003"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_004",
      "module": "objects_and_props",
      "field_path": "[3]",
      "claim": "decorative pattern on bell body",
      "value": "present",
      "supporting_observation_ids": [
        "obs_object_004"
      ],
      "confidence": 0.95,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_obj_005",
      "module": "objects_and_props",
      "field_path": "[4]",
      "claim": "glowing core inside bell",
      "value": "present",
      "supporting_observation_ids": [
        "obs_object_005"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_env_001",
      "module": "environment",
      "field_path": "setting",
      "claim": "background style",
      "value": "purple swirling background",
      "supporting_observation_ids": [
        "obs_visual_design_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text",
      "value": "ダークベル",
      "supporting_observation_ids": [
        "obs_card_ui_text_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_002",
      "module": "card_ui_and_print_markers",
      "field_path": "other_print_marker",
      "claim": "top right text",
      "value": "トレーナーズ",
      "supporting_observation_ids": [
        "obs_card_ui_text_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_003",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "collector number and rarity",
      "value": "105/081 SR",
      "supporting_observation_ids": [
        "obs_card_ui_text_003"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_004",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator",
      "value": "Illus. Toyste Beach",
      "supporting_observation_ids": [
        "obs_card_ui_text_004"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_005",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line",
      "claim": "copyright line",
      "value": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "supporting_observation_ids": [
        "obs_card_ui_text_005"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_006",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text",
      "claim": "bottom line text in Japanese",
      "value": "present",
      "supporting_observation_ids": [
        "obs_card_ui_text_006"
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
      "confidence": 0.99
    }
  ],
  "scene_layers": {
    "foreground": [],
    "midground": [
      "obs_object_001",
      "obs_object_002",
      "obs_object_003",
      "obs_object_004",
      "obs_object_005"
    ],
    "background": [
      "obs_visual_design_001"
    ]
  },
  "environment": {
    "setting": [
      "purple swirling background"
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
      "obs_visual_design_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_object_001",
      "label": "dark bell",
      "normalized_label": "dark bell",
      "object_type": "bell",
      "colors": [
        "black",
        "blue highlights",
        "dark gray"
      ],
      "material_appearance": [
        "bright edges",
        "dark rounded surface"
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
      "dark gray",
      "purple",
      "white highlights"
    ],
    "lighting": [
      "bright edges highlight"
    ],
    "shadows": [
      "soft shadows on bell"
    ],
    "highlights": [
      "blue glowing core"
    ],
    "composition": [
      "central object",
      "swirling background"
    ],
    "camera_angle": "angled from below",
    "framing": "centered",
    "cropping": [
      "full bell visible"
    ],
    "depth": "moderate depth with background swirl",
    "motion_cues": [
      "swirling background depicting motion"
    ],
    "motifs": [
      "geometric patterns on bell"
    ],
    "repeated_shapes": [
      "polygonal shapes on handle and bell"
    ],
    "style_cues": [
      "digital art",
      "stylized illustration"
    ],
    "supporting_observation_ids": [
      "obs_object_001",
      "obs_visual_design_001"
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
        "obs_object_001",
        "obs_object_002",
        "obs_object_003",
        "obs_object_004",
        "obs_object_005"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_env_001"
      ],
      "observation_ids": [
        "obs_visual_design_001"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_object_001",
        "obs_visual_design_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_object_001",
        "obs_visual_design_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": [
        "obs_visual_design_001"
      ]
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_ui_001",
        "fact_ui_002",
        "fact_ui_003",
        "fact_ui_004",
        "fact_ui_005",
        "fact_ui_006"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_text_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_card_ui_text_003"
      ],
      "set_symbol_observation_ids": [],
      "rarity_mark_observation_ids": [
        "obs_card_ui_text_003"
      ],
      "copyright_line_observation_ids": [
        "obs_card_ui_text_005"
      ],
      "bottom_line_text_observation_ids": [
        "obs_card_ui_text_006"
      ],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_card_ui_text_004"
      ],
      "error_marker_observation_ids": [],
      "other_print_marker_observation_ids": [
        "obs_card_ui_text_002"
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
        "bell handle",
        "bell body",
        "decorative pattern",
        "glowing core",
        "purple swirling background"
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
      "term": "bell handle",
      "supporting_observation_ids": [
        "obs_object_002"
      ]
    },
    {
      "term": "bell body",
      "supporting_observation_ids": [
        "obs_object_003"
      ]
    },
    {
      "term": "decorative pattern",
      "supporting_observation_ids": [
        "obs_object_004"
      ]
    },
    {
      "term": "glowing core",
      "supporting_observation_ids": [
        "obs_object_005"
      ]
    },
    {
      "term": "purple swirling background",
      "supporting_observation_ids": [
        "obs_visual_design_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "glowing highlights",
        "source_observation_ids": [
          "obs_object_005"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.9
      },
      {
        "concept": "spiral motif",
        "source_observation_ids": [
          "obs_visual_design_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-074 - リトライバッジ

- Branch: `item_tool_supporter`
- Review status: `pending`
- Description confidence: `0.99`
- Attribute confidence: `0.97`
- Cost USD: `0.0091808`
- Artwork observations: `4`
- Card UI / print-marker observations: `8`
- Card UI module evidence references: `8`
- Derived digest: Fact digest. Visible observations: badge, star-shaped badge with ribbon tails, gray and white color tones on badge, light blue and white swirling background pattern. Counts: badge: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| badge | badge | object | midground | high | 0.99 |
| star-shaped badge with ribbon tails | star-shaped badge with ribbon tails | object | midground | high | 0.98 |
| gray and white color tones on badge | gray and white color tones on badge | object | midground | medium | 0.95 |
| light blue and white swirling background pattern | light blue and white swirling background pattern | environment | background | medium | 0.96 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| リトライバッジ | card_name_text | top-left | visible | 0.99 |
| m5 set symbol | set_symbol | bottom-left | visible | 0.98 |
| 074/081 | collector_number | bottom-left | visible | 0.98 |
| ©2026 Pokémon/Nintendo/Creatures/GAME FREAK. | copyright_text | bottom-center | visible | 0.95 |
| ポケモンのどうぐは、自分の番に何枚でも、自分のポケモンにつけられる。ポケモン1匹につき1枚だけつけられ、つけたままにする。 | bottom_line_text | bottom-right | visible | 0.96 |
| トレーナーズ | card_ui_text | top-right | visible | 0.99 |
| ポケモンのどうぐ logo | logo | top-left | visible | 0.97 |
| Illus. Toyste Beach | illustrator_text | bottom-left | visible | 0.95 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_object_001 | objects_and_props | object label | obs_object_001 | 0.99 |
| fact_object_002 | objects_and_props | object detail | obs_object_detail_001 | 0.98 |
| fact_object_003 | objects_and_props | object colors | obs_object_color_001 | 0.95 |
| fact_environment_001 | environment | background pattern | obs_environment_001 | 0.96 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_name_001 | card name text | obs_card_ui_name_001 | 0.99 |
| fact_card_ui_set_symbol_001 | set symbol | obs_card_ui_set_symbol_001 | 0.98 |
| fact_card_ui_collector_number_001 | collector number | obs_card_ui_number_001 | 0.98 |
| fact_card_ui_copyright_001 | copyright text | obs_card_ui_copyright_001 | 0.95 |
| fact_card_ui_bottom_text_001 | bottom legal text | obs_card_ui_textblock_001 | 0.96 |
| fact_card_ui_trainer_label_001 | trainer label text | obs_card_ui_trainer_label_001 | 0.99 |
| fact_card_ui_logo_001 | logo text | obs_card_ui_logo_001 | 0.97 |
| fact_card_ui_illustrator_001 | illustrator text | obs_card_ui_illustrator_001 | 0.95 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_bottom_text_001",
    "fact_card_ui_collector_number_001",
    "fact_card_ui_copyright_001",
    "fact_card_ui_illustrator_001",
    "fact_card_ui_logo_001",
    "fact_card_ui_name_001",
    "fact_card_ui_set_symbol_001",
    "fact_card_ui_trainer_label_001"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_name_001",
    "obs_card_ui_trainer_label_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_card_ui_number_001"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_set_symbol_001"
  ],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [
    "obs_card_ui_copyright_001"
  ],
  "bottom_line_text_observation_ids": [
    "obs_card_ui_textblock_001"
  ],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [
    "obs_card_ui_logo_001"
  ],
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
| human_appearance | none_visible | none | not_applicable |  |
| creature_anatomy | none_visible | none | not_applicable |  |
| clothing | none_visible | none | not_applicable |  |
| objects_and_props | complete | none | high |  |
| environment | complete | low | high |  |
| composition | likely_complete | low | high |  |
| color_and_light | likely_complete | low | high |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | complete | none | high |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | not_applicable | none | not_applicable |  |
| fact_grounded_search_terms | likely_complete | low | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| none recorded | | | | | | |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| badge | exact | 1 | obs_object_001 | 0.99 |

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
| badge | obs_object_001 |
| star-shaped badge | obs_object_detail_001 |
| ribbon tails | obs_object_detail_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| spiral motif | obs_environment_001 | deterministic_rule | 0.96 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: badge, star-shaped badge with ribbon tails, gray and white color tones on badge, light blue and white swirling background pattern. Counts: badge: 1.
- Quality flags: `none`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_object_001",
      "kind": "object",
      "label": "badge",
      "normalized_label": "badge",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_detail_001",
      "kind": "object",
      "label": "star-shaped badge with ribbon tails",
      "normalized_label": "star-shaped badge with ribbon tails",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_color_001",
      "kind": "object",
      "label": "gray and white color tones on badge",
      "normalized_label": "gray and white color tones on badge",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "light blue and white swirling background pattern",
      "normalized_label": "light blue and white swirling background pattern",
      "scene_layer": "background",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_001",
      "kind": "card_name_text",
      "label": "リトライバッジ",
      "normalized_label": "リトライバッジ",
      "scene_layer": "ui",
      "frame_position": "top-left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_symbol_001",
      "kind": "set_symbol",
      "label": "m5 set symbol",
      "normalized_label": "m5 set symbol",
      "scene_layer": "ui",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_number_001",
      "kind": "collector_number",
      "label": "074/081",
      "normalized_label": "074/081",
      "scene_layer": "ui",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_copyright_001",
      "kind": "copyright_text",
      "label": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK.",
      "normalized_label": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK.",
      "scene_layer": "ui",
      "frame_position": "bottom-center",
      "visibility": "visible",
      "salience": "low",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_textblock_001",
      "kind": "bottom_line_text",
      "label": "ポケモンのどうぐは、自分の番に何枚でも、自分のポケモンにつけられる。ポケモン1匹につき1枚だけつけられ、つけたままにする。",
      "normalized_label": "ポケモンのどうぐは、自分の番に何枚でも、自分のポケモンにつけられる。ポケモン1匹につき1枚だけつけられ、つけたままにする。",
      "scene_layer": "ui",
      "frame_position": "bottom-right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_trainer_label_001",
      "kind": "card_ui_text",
      "label": "トレーナーズ",
      "normalized_label": "トレーナーズ",
      "scene_layer": "ui",
      "frame_position": "top-right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_logo_001",
      "kind": "logo",
      "label": "ポケモンのどうぐ logo",
      "normalized_label": "ポケモンのどうぐ logo",
      "scene_layer": "ui",
      "frame_position": "top-left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_illustrator_001",
      "kind": "illustrator_text",
      "label": "Illus. Toyste Beach",
      "normalized_label": "Illus. Toyste Beach",
      "scene_layer": "ui",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "low",
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_object_001",
      "module": "objects_and_props",
      "field_path": "objects_and_props[0]",
      "claim": "object label",
      "value": "badge",
      "supporting_observation_ids": [
        "obs_object_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_object_002",
      "module": "objects_and_props",
      "field_path": "objects_and_props[1]",
      "claim": "object detail",
      "value": "star-shaped badge with ribbon tails",
      "supporting_observation_ids": [
        "obs_object_detail_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_object_003",
      "module": "objects_and_props",
      "field_path": "objects_and_props[2]",
      "claim": "object colors",
      "value": "gray and white",
      "supporting_observation_ids": [
        "obs_object_color_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "environment.setting[0]",
      "claim": "background pattern",
      "value": "light blue and white swirling background",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_name_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text_observation_ids[0]",
      "claim": "card name text",
      "value": "リトライバッジ",
      "supporting_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_set_symbol_001",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol_observation_ids[0]",
      "claim": "set symbol",
      "value": "m5",
      "supporting_observation_ids": [
        "obs_card_ui_set_symbol_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_collector_number_001",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number_observation_ids[0]",
      "claim": "collector number",
      "value": "074/081",
      "supporting_observation_ids": [
        "obs_card_ui_number_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_copyright_001",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line_observation_ids[0]",
      "claim": "copyright text",
      "value": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "supporting_observation_ids": [
        "obs_card_ui_copyright_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_bottom_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text_observation_ids[0]",
      "claim": "bottom legal text",
      "value": "ポケモンのどうぐは、自分の番に何枚でも、自分のポケモンにつけられる。ポケモン1匹につき1枚だけつけられ、つけたままにする。",
      "supporting_observation_ids": [
        "obs_card_ui_textblock_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_trainer_label_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text_observation_ids[1]",
      "claim": "trainer label text",
      "value": "トレーナーズ",
      "supporting_observation_ids": [
        "obs_card_ui_trainer_label_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_logo_001",
      "module": "card_ui_and_print_markers",
      "field_path": "logo_observation_ids[0]",
      "claim": "logo text",
      "value": "ポケモンのどうぐ",
      "supporting_observation_ids": [
        "obs_card_ui_logo_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_illustrator_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text_observation_ids[0]",
      "claim": "illustrator text",
      "value": "Illus. Toyste Beach",
      "supporting_observation_ids": [
        "obs_card_ui_illustrator_001"
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
      "count_id": "count_object_001",
      "normalized_label": "badge",
      "count_type": "exact",
      "exact_count": 1,
      "estimated_min": 0,
      "estimated_max": 0,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_object_001"
      ],
      "scene_layer": "midground",
      "confidence": 0.99
    }
  ],
  "scene_layers": {
    "foreground": [],
    "midground": [
      "obs_object_001",
      "obs_object_color_001",
      "obs_object_detail_001"
    ],
    "background": [
      "obs_environment_001"
    ]
  },
  "environment": {
    "setting": [
      "light blue and white swirling background pattern"
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
      "observation_id": "obs_object_001",
      "label": "badge",
      "normalized_label": "badge",
      "object_type": "object",
      "colors": [
        "gray",
        "white"
      ],
      "material_appearance": [
        "smooth metallic-looking surface"
      ],
      "location": "center",
      "count_reference": "count_object_001",
      "confidence": 0.99
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "gray",
      "light blue",
      "silver tones",
      "white"
    ],
    "lighting": [
      "highlight on badge center"
    ],
    "shadows": [
      "soft shadows on badge edges"
    ],
    "highlights": [
      "bright highlight on badge front"
    ],
    "composition": [
      "central composition",
      "single object focal point"
    ],
    "camera_angle": "straight-on",
    "framing": "full object visible with slight top crop",
    "cropping": [],
    "depth": "shallow depth of field focusing on badge",
    "motion_cues": [],
    "motifs": [
      "ribbon motif",
      "star motif"
    ],
    "repeated_shapes": [
      "star shape"
    ],
    "style_cues": [
      "clean digital illustration"
    ],
    "supporting_observation_ids": [
      "obs_environment_001",
      "obs_object_001",
      "obs_object_color_001",
      "obs_object_detail_001"
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
        "fact_object_001",
        "fact_object_002",
        "fact_object_003"
      ],
      "object_observation_ids": [
        "obs_object_001",
        "obs_object_color_001",
        "obs_object_detail_001"
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
      "observation_ids": [
        "obs_object_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_object_color_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": []
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_ui_bottom_text_001",
        "fact_card_ui_collector_number_001",
        "fact_card_ui_copyright_001",
        "fact_card_ui_illustrator_001",
        "fact_card_ui_logo_001",
        "fact_card_ui_name_001",
        "fact_card_ui_set_symbol_001",
        "fact_card_ui_trainer_label_001"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_name_001",
        "obs_card_ui_trainer_label_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_card_ui_number_001"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_set_symbol_001"
      ],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [
        "obs_card_ui_copyright_001"
      ],
      "bottom_line_text_observation_ids": [
        "obs_card_ui_textblock_001"
      ],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [
        "obs_card_ui_logo_001"
      ],
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
        "count_object_001"
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
        "badge",
        "star-shaped badge",
        "ribbon tails"
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
      "term": "badge",
      "supporting_observation_ids": [
        "obs_object_001"
      ]
    },
    {
      "term": "star-shaped badge",
      "supporting_observation_ids": [
        "obs_object_detail_001"
      ]
    },
    {
      "term": "ribbon tails",
      "supporting_observation_ids": [
        "obs_object_detail_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "spiral motif",
        "source_observation_ids": [
          "obs_environment_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.96
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-073 - ごうかいボム

- Branch: `item_tool_supporter`
- Review status: `needs_review`
- Description confidence: `0.99`
- Attribute confidence: `0.95`
- Cost USD: `0.0090288`
- Artwork observations: `8`
- Card UI / print-marker observations: `5`
- Card UI module evidence references: `5`
- Derived digest: Fact digest. Visible observations: bomb, bomb body, yellow striped band, segmented panel band, red fuse, lit fuse spark, explosion burst, blue glow. Counts: bomb: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| bomb | bomb | object | midground | high | 0.99 |
| dark rounded bomb body | bomb body | object | midground | high | 0.95 |
| yellow striped band around bomb | yellow striped band | object | midground | high | 0.95 |
| horizontal segmented black panel band | segmented panel band | object | midground | high | 0.93 |
| red fuse | red fuse | object | midground | medium | 0.97 |
| white sparkling lit fuse ignition | lit fuse spark | object | midground | medium | 0.96 |
| orange explosion burst background | explosion burst | environment | background | medium | 0.94 |
| blue aura glow around bomb | blue glow | environment | background | medium | 0.92 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text ごうかいボム | card_ui_text | top_left | visible | 0.99 |
| set code jpn-m5 | card_ui_text | bottom_left | visible | 0.95 |
| card number 073/081 | card_ui_text | bottom_left | visible | 0.95 |
| illustrator illus. inose yukie | card_ui_text | bottom_left | visible | 0.95 |
| copyright line ©2026 Pokémon/Nintendo/Creatures/GAME FREAK. | card_ui_text | bottom_center | visible | 0.95 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | objects_and_props | The main object is a bomb | obs_object_001 | 0.99 |
| fact_002 | objects_and_props | The bomb has a dark rounded body | obs_object_detail_001 | 0.95 |
| fact_003 | objects_and_props | The bomb has a yellow striped band around it | obs_object_detail_002 | 0.95 |
| fact_004 | objects_and_props | The bomb has a horizontal segmented black panel band | obs_object_detail_003 | 0.93 |
| fact_005 | objects_and_props | The bomb has a red fuse | obs_object_detail_004 | 0.97 |
| fact_006 | objects_and_props | The fuse is lit and sparkling white | obs_object_detail_005 | 0.96 |
| fact_007 | environment | The bomb is in front of an orange explosion burst background | obs_environment_001 | 0.94 |
| fact_008 | environment | The bomb is surrounded by a blue aura glow | obs_environment_002 | 0.92 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_009 | Card name text is ごうかいボム | obs_card_ui_text_001 | 0.99 |
| fact_010 | Set code is visible: jpn-m5 | obs_card_ui_text_002 | 0.95 |
| fact_011 | Collector number visible: 073/081 | obs_card_ui_text_003 | 0.95 |
| fact_012 | Illustrator text visible: illus. inose yukie | obs_card_ui_text_004 | 0.95 |
| fact_013 | Copyright line visible | obs_card_ui_text_005 | 0.95 |

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
    "obs_card_ui_text_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_card_ui_text_003"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_text_002"
  ],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [
    "obs_card_ui_text_005"
  ],
  "bottom_line_text_observation_ids": [],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_card_ui_text_004"
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
| composition | likely_complete | low | high |  |
| color_and_light | likely_complete | low | high |  |
| visual_effects | likely_complete | low | high |  |
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
| bomb | exact | 1 | obs_object_001 | 0.99 |

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
| bomb | obs_object_001 |
| bomb body | obs_object_detail_001 |
| yellow striped band | obs_object_detail_002 |
| segmented panel band | obs_object_detail_003 |
| red fuse | obs_object_detail_004 |
| lit fuse spark | obs_object_detail_005 |
| explosion burst | obs_environment_001 |
| blue glow | obs_environment_002 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| explosion | obs_environment_001 | deterministic_rule | 0.94 |
| glowing highlights | obs_environment_002 | deterministic_rule | 0.92 |
| spark | obs_object_detail_005 | deterministic_rule | 0.96 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: bomb, bomb body, yellow striped band, segmented panel band, red fuse, lit fuse spark, explosion burst, blue glow. Counts: bomb: 1.
- Quality flags: `potential_module_review_conflicts_with_entries`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_object_001",
      "kind": "object",
      "label": "bomb",
      "normalized_label": "bomb",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_detail_001",
      "kind": "object",
      "label": "dark rounded bomb body",
      "normalized_label": "bomb body",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_detail_002",
      "kind": "object",
      "label": "yellow striped band around bomb",
      "normalized_label": "yellow striped band",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_detail_003",
      "kind": "object",
      "label": "horizontal segmented black panel band",
      "normalized_label": "segmented panel band",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.93,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_detail_004",
      "kind": "object",
      "label": "red fuse",
      "normalized_label": "red fuse",
      "scene_layer": "midground",
      "frame_position": "top_right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_detail_005",
      "kind": "object",
      "label": "white sparkling lit fuse ignition",
      "normalized_label": "lit fuse spark",
      "scene_layer": "midground",
      "frame_position": "top_right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "orange explosion burst background",
      "normalized_label": "explosion burst",
      "scene_layer": "background",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_002",
      "kind": "environment",
      "label": "blue aura glow around bomb",
      "normalized_label": "blue glow",
      "scene_layer": "background",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_001",
      "kind": "card_ui_text",
      "label": "card name text ごうかいボム",
      "normalized_label": "card_name_goukai_bomb",
      "scene_layer": "overlay",
      "frame_position": "top_left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_002",
      "kind": "card_ui_text",
      "label": "set code jpn-m5",
      "normalized_label": "set_code_jpn_m5",
      "scene_layer": "overlay",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_003",
      "kind": "card_ui_text",
      "label": "card number 073/081",
      "normalized_label": "card_number_073/081",
      "scene_layer": "overlay",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_004",
      "kind": "card_ui_text",
      "label": "illustrator illus. inose yukie",
      "normalized_label": "illustrator_inose_yukie",
      "scene_layer": "overlay",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_005",
      "kind": "card_ui_text",
      "label": "copyright line ©2026 Pokémon/Nintendo/Creatures/GAME FREAK.",
      "normalized_label": "copyright_line",
      "scene_layer": "overlay",
      "frame_position": "bottom_center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_001",
      "module": "objects_and_props",
      "field_path": "objects_and_props.0.label",
      "claim": "The main object is a bomb",
      "value": "bomb",
      "supporting_observation_ids": [
        "obs_object_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_002",
      "module": "objects_and_props",
      "field_path": "objects_and_props.0.physical_features",
      "claim": "The bomb has a dark rounded body",
      "value": "dark rounded bomb body",
      "supporting_observation_ids": [
        "obs_object_detail_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_003",
      "module": "objects_and_props",
      "field_path": "objects_and_props.0.physical_features",
      "claim": "The bomb has a yellow striped band around it",
      "value": "yellow striped band",
      "supporting_observation_ids": [
        "obs_object_detail_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "objects_and_props",
      "field_path": "objects_and_props.0.physical_features",
      "claim": "The bomb has a horizontal segmented black panel band",
      "value": "segmented panel band",
      "supporting_observation_ids": [
        "obs_object_detail_003"
      ],
      "confidence": 0.93,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_005",
      "module": "objects_and_props",
      "field_path": "objects_and_props.0.physical_features",
      "claim": "The bomb has a red fuse",
      "value": "red fuse",
      "supporting_observation_ids": [
        "obs_object_detail_004"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_006",
      "module": "objects_and_props",
      "field_path": "objects_and_props.0.visual_effects",
      "claim": "The fuse is lit and sparkling white",
      "value": "white sparkling lit fuse ignition",
      "supporting_observation_ids": [
        "obs_object_detail_005"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_007",
      "module": "environment",
      "field_path": "environment.background",
      "claim": "The bomb is in front of an orange explosion burst background",
      "value": "orange explosion burst background",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_008",
      "module": "environment",
      "field_path": "environment.background",
      "claim": "The bomb is surrounded by a blue aura glow",
      "value": "blue aura glow around bomb",
      "supporting_observation_ids": [
        "obs_environment_002"
      ],
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_009",
      "module": "card_ui_and_print_markers",
      "field_path": "card_name_text",
      "claim": "Card name text is ごうかいボム",
      "value": "ごうかいボム",
      "supporting_observation_ids": [
        "obs_card_ui_text_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_010",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "Set code is visible: jpn-m5",
      "value": "jpn-m5",
      "supporting_observation_ids": [
        "obs_card_ui_text_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_011",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "Collector number visible: 073/081",
      "value": "073/081",
      "supporting_observation_ids": [
        "obs_card_ui_text_003"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_012",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "Illustrator text visible: illus. inose yukie",
      "value": "illus. inose yukie",
      "supporting_observation_ids": [
        "obs_card_ui_text_004"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_013",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line",
      "claim": "Copyright line visible",
      "value": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "supporting_observation_ids": [
        "obs_card_ui_text_005"
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
        "obs_object_001"
      ],
      "scene_layer": "midground",
      "confidence": 0.99
    }
  ],
  "scene_layers": {
    "foreground": [],
    "midground": [
      "obs_object_001",
      "obs_object_detail_001",
      "obs_object_detail_002",
      "obs_object_detail_003",
      "obs_object_detail_004",
      "obs_object_detail_005"
    ],
    "background": [
      "obs_environment_001",
      "obs_environment_002"
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
      "obs_environment_002"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_object_001",
      "label": "bomb",
      "normalized_label": "bomb",
      "object_type": "tool",
      "colors": [
        "black",
        "red",
        "white",
        "yellow"
      ],
      "material_appearance": [
        "bright highlight",
        "dark rounded surface",
        "glowing lit fuse"
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
      "white",
      "yellow"
    ],
    "lighting": [
      "bright highlight on bomb",
      "sparkling fuse light"
    ],
    "shadows": [
      "shadow under bomb"
    ],
    "highlights": [
      "reflective highlights on bomb"
    ],
    "composition": [
      "centered bomb",
      "explosion burst background"
    ],
    "camera_angle": "straight-on",
    "framing": "medium close-up",
    "cropping": [
      "full bomb object visible"
    ],
    "depth": "midground object with background layers",
    "motion_cues": [
      "sparkling fuse light indicating ignition"
    ],
    "motifs": [
      "explosion motif"
    ],
    "repeated_shapes": [
      "segmented band around bomb"
    ],
    "style_cues": [
      "stylized digital artwork"
    ],
    "supporting_observation_ids": [
      "obs_environment_001",
      "obs_environment_002",
      "obs_object_001",
      "obs_object_detail_001",
      "obs_object_detail_005"
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
        "fact_005",
        "fact_006"
      ],
      "object_observation_ids": [
        "obs_object_001",
        "obs_object_detail_001",
        "obs_object_detail_002",
        "obs_object_detail_003",
        "obs_object_detail_004",
        "obs_object_detail_005"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_007",
        "fact_008"
      ],
      "observation_ids": [
        "obs_environment_001",
        "obs_environment_002"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_environment_001",
        "obs_environment_002",
        "obs_object_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_environment_001",
        "obs_environment_002",
        "obs_object_detail_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [
        "fact_006"
      ],
      "observation_ids": [
        "obs_object_detail_005"
      ]
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
        "obs_card_ui_text_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_card_ui_text_003"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_text_002"
      ],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [
        "obs_card_ui_text_005"
      ],
      "bottom_line_text_observation_ids": [],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_card_ui_text_004"
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
        "bomb",
        "bomb body",
        "yellow striped band",
        "segmented panel band",
        "red fuse",
        "lit fuse spark",
        "explosion burst",
        "blue glow"
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
      "term": "bomb",
      "supporting_observation_ids": [
        "obs_object_001"
      ]
    },
    {
      "term": "bomb body",
      "supporting_observation_ids": [
        "obs_object_detail_001"
      ]
    },
    {
      "term": "yellow striped band",
      "supporting_observation_ids": [
        "obs_object_detail_002"
      ]
    },
    {
      "term": "segmented panel band",
      "supporting_observation_ids": [
        "obs_object_detail_003"
      ]
    },
    {
      "term": "red fuse",
      "supporting_observation_ids": [
        "obs_object_detail_004"
      ]
    },
    {
      "term": "lit fuse spark",
      "supporting_observation_ids": [
        "obs_object_detail_005"
      ]
    },
    {
      "term": "explosion burst",
      "supporting_observation_ids": [
        "obs_environment_001"
      ]
    },
    {
      "term": "blue glow",
      "supporting_observation_ids": [
        "obs_environment_002"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "explosion",
        "source_observation_ids": [
          "obs_environment_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.94
      },
      {
        "concept": "glowing highlights",
        "source_observation_ids": [
          "obs_environment_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "spark",
        "source_observation_ids": [
          "obs_object_detail_005"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.96
      }
    ]
  }
}
```

</details>

## Validation Failures

- GV-PK-JPN-M5-112: fact_graph_semantic_fact_label_not_supported_v1:sem_002
- GV-PK-JPN-M5-096: fact_graph_semantic_fact_label_not_supported_v1:semfact_pose_alert_001
- GV-PK-JPN-M5-063: fact_graph_semantic_fact_label_not_supported_v1:sem_fact_002
- GV-PK-JPN-M5-110: fact_graph_semantic_fact_label_not_supported_v1:svf_pose_female_001

