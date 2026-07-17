# Card Visual Fact Graph V2 Review Packet

Generated rows: 14
Validation failures: 11
Skipped images: 0
Estimated cost USD: 0.2480872

## Rows

### GV-PK-JPN-M5-113 - Mega Chandelure ex

- Branch: `pokemon`
- Review status: `needs_review`
- Description confidence: `0.98`
- Attribute confidence: `0.96`
- Cost USD: `0.0119152`
- Artwork observations: `11`
- Card UI / print-marker observations: `9`
- Card UI module evidence references: `6`
- Derived digest: Fact digest. Scene subjects: Mega Chandelure. Visible observations: Mega Chandelure, body, arms with flames, purple flames, lower tail swirl, eyes, mouth, purple aura. Semantic facts: dark forest, smiling, floating.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Chandelure Pokemon | Mega Chandelure | scene_subject | foreground | high | 0.99 |
| Mega Chandelure central purple spherical body | body | object | foreground | high | 0.98 |
| Mega Chandelure black curved arms with flames | arms with flames | object | foreground | high | 0.97 |
| Mega Chandelure purple flames on arms | purple flames | object | foreground | high | 0.96 |
| Mega Chandelure twisted black lower tail | lower tail swirl | object | foreground | medium | 0.95 |
| Mega Chandelure dark eyes with purple glow | eyes | object | foreground | high | 0.93 |
| Mega Chandelure mouth with dark smile | mouth | object | foreground | medium | 0.9 |
| Mega Chandelure glowing purple aura | purple aura | object | foreground | medium | 0.92 |
| Dark forest background | dark forest background | object | background | medium | 0.9 |
| Dim lighting with spotlight effect | spotlight lighting | object | background | medium | 0.88 |
| Purple flame effects around subject | purple flames | object | foreground | high | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| Japanese card name text: メガシャンデラEX (Mega Chandelure EX) | card_name_text | top | visible | 0.99 |
| HP 350 in upper right corner | hp_text | top right | visible | 0.99 |
| Psychic energy symbol next to HP | energy_symbol | top right | visible | 0.98 |
| Attack name in Japanese: ファントムメイズ (Phantom Maze) | text_box | lower middle | visible | 0.98 |
| Attack damage 130+ | text_box | lower middle right | visible | 0.99 |
| Set symbol bottom left corner with M5 and small text 113/081 SAR | set_symbol | bottom left | visible | 0.95 |
| Resistance and Weakness values bottom left corner | text_box | bottom left | visible | 0.9 |
| Illustrator text bottom right corner (small text) | illustrator_text | bottom right | visible | 0.85 |
| Stage 2 evolution symbol next to Japanese text on left side | card_type_icon | top left | visible | 0.95 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | This card's main scene subject is Mega Chandelure | obs_subject_001 | 0.99 |
| fact_creature_anatomy_001 | creature_anatomy | Mega Chandelure has a central purple spherical body | obs_creature_anatomy_001 | 0.98 |
| fact_creature_anatomy_002 | creature_anatomy | Mega Chandelure has black curved arms with purple flames | obs_creature_anatomy_002, obs_creature_anatomy_003 | 0.97 |
| fact_creature_anatomy_003 | creature_anatomy | Mega Chandelure has a twisted black lower tail curling swirl | obs_creature_anatomy_004 | 0.95 |
| fact_creature_anatomy_004 | creature_anatomy | Mega Chandelure has dark eyes with glowing purple details | obs_creature_anatomy_005 | 0.93 |
| fact_creature_anatomy_005 | creature_anatomy | Mega Chandelure has a dark smile visible on its mouth | obs_creature_anatomy_006 | 0.9 |
| fact_creature_anatomy_006 | creature_anatomy | Mega Chandelure is surrounded by a glowing purple aura | obs_creature_anatomy_007 | 0.92 |
| fact_environment_001 | environment | The setting is a dark forest background | obs_environment_001 | 0.9 |
| fact_environment_002 | environment | Dim lighting with spotlight effect is present around Mega Chandelure | obs_environment_002 | 0.88 |
| fact_objects_and_props_001 | objects_and_props | Purple flame effects appear around Mega Chandelure's arms and body | obs_objects_001 | 0.95 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_and_print_markers_001 | Visible card name text in Japanese: メガシャンデラEX | obs_card_ui_001 | 0.99 |
| fact_card_ui_and_print_markers_002 | HP value visible as 350 in upper right corner | obs_card_ui_002 | 0.99 |
| fact_card_ui_and_print_markers_003 | Psychic energy symbol visible near HP | obs_card_ui_003 | 0.98 |
| fact_card_ui_and_print_markers_004 | Attack name in Japanese: ファントムメイズ | obs_card_ui_004 | 0.98 |
| fact_card_ui_and_print_markers_005 | Attack damage value visible as 130+ | obs_card_ui_005 | 0.99 |
| fact_card_ui_and_print_markers_006 | Set symbol with M5 and collector number 113/081 SAR visible at bottom left | obs_card_ui_006 | 0.95 |
| fact_card_ui_and_print_markers_007 | Resistance and weakness values visible in bottom left interface area | obs_card_ui_007 | 0.9 |
| fact_card_ui_and_print_markers_008 | Illustrator text visible in bottom right corner in small font | obs_card_ui_008 | 0.85 |
| fact_card_ui_and_print_markers_009 | Stage 2 evolution symbol visible next to Japanese text on left side | obs_card_ui_009 | 0.95 |

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
    "fact_card_ui_and_print_markers_009"
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
    "obs_card_ui_006"
  ],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [],
  "bottom_line_text_observation_ids": [],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [
    "obs_card_ui_003"
  ],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_card_ui_008"
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
| environment | complete | low | high |  |
| composition | complete | none | high |  |
| color_and_light | complete | low | high |  |
| visual_effects | complete | low | high |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | likely_complete | low | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| sem_fact_001 | scene_type | dark forest |  | obs_environment_001 | dark forest background | 0.9 |
| sem_fact_002 | expression | smiling | obs_subject_001 | obs_creature_anatomy_006 | smiling mouth smile | 0.9 |
| sem_fact_003 | action | floating | obs_subject_001 | obs_subject_001 | floating pose upright stationary | 0.99 |

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
| purple flame | obs_objects_001 |
| floating Pokemon | obs_subject_001 |
| dark forest background | obs_environment_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| centered | obs_subject_001 | deterministic_rule | 0.99 |
| dark forest | obs_environment_001 | deterministic_rule | 0.9 |
| flame | obs_creature_anatomy_002, obs_creature_anatomy_003, obs_objects_001 | deterministic_rule | 0.97 |
| floating | obs_subject_001 | deterministic_rule | 0.99 |
| forest | obs_environment_001 | deterministic_rule | 0.9 |
| forward orientation | obs_subject_001 | deterministic_rule | 0.99 |
| glowing highlights | obs_creature_anatomy_003, obs_objects_001 | deterministic_rule | 0.92 |
| smiling | obs_creature_anatomy_006 | deterministic_rule | 0.9 |
| spiral motif | obs_creature_anatomy_004 | deterministic_rule | 0.95 |
| upright | obs_subject_001 | deterministic_rule | 0.99 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Chandelure. Visible observations: Mega Chandelure, body, arms with flames, purple flames, lower tail swirl, eyes, mouth, purple aura. Semantic facts: dark forest, smiling, floating.
- Quality flags: `potential_count_reference_inconsistent`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "Mega Chandelure Pokemon",
      "normalized_label": "Mega Chandelure",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_001",
      "kind": "object",
      "label": "Mega Chandelure central purple spherical body",
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
      "kind": "object",
      "label": "Mega Chandelure black curved arms with flames",
      "normalized_label": "arms with flames",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_003",
      "kind": "object",
      "label": "Mega Chandelure purple flames on arms",
      "normalized_label": "purple flames",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_004",
      "kind": "object",
      "label": "Mega Chandelure twisted black lower tail",
      "normalized_label": "lower tail swirl",
      "scene_layer": "foreground",
      "frame_position": "center-bottom",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_005",
      "kind": "object",
      "label": "Mega Chandelure dark eyes with purple glow",
      "normalized_label": "eyes",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.93,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_006",
      "kind": "object",
      "label": "Mega Chandelure mouth with dark smile",
      "normalized_label": "mouth",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_007",
      "kind": "object",
      "label": "Mega Chandelure glowing purple aura",
      "normalized_label": "purple aura",
      "scene_layer": "foreground",
      "frame_position": "around subject",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "object",
      "label": "Dark forest background",
      "normalized_label": "dark forest background",
      "scene_layer": "background",
      "frame_position": "full card background",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_002",
      "kind": "object",
      "label": "Dim lighting with spotlight effect",
      "normalized_label": "spotlight lighting",
      "scene_layer": "background",
      "frame_position": "around subject",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.88,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_objects_001",
      "kind": "object",
      "label": "Purple flame effects around subject",
      "normalized_label": "purple flames",
      "scene_layer": "foreground",
      "frame_position": "near arms and body",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_001",
      "kind": "card_name_text",
      "label": "Japanese card name text: メガシャンデラEX (Mega Chandelure EX)",
      "normalized_label": "card name text",
      "scene_layer": "interface",
      "frame_position": "top",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_002",
      "kind": "hp_text",
      "label": "HP 350 in upper right corner",
      "normalized_label": "HP 350",
      "scene_layer": "interface",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_003",
      "kind": "energy_symbol",
      "label": "Psychic energy symbol next to HP",
      "normalized_label": "Psychic energy symbol",
      "scene_layer": "interface",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_004",
      "kind": "text_box",
      "label": "Attack name in Japanese: ファントムメイズ (Phantom Maze)",
      "normalized_label": "attack name",
      "scene_layer": "interface",
      "frame_position": "lower middle",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_005",
      "kind": "text_box",
      "label": "Attack damage 130+",
      "normalized_label": "attack damage",
      "scene_layer": "interface",
      "frame_position": "lower middle right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_006",
      "kind": "set_symbol",
      "label": "Set symbol bottom left corner with M5 and small text 113/081 SAR",
      "normalized_label": "set symbol and collector info",
      "scene_layer": "interface",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_007",
      "kind": "text_box",
      "label": "Resistance and Weakness values bottom left corner",
      "normalized_label": "resistance and weakness",
      "scene_layer": "interface",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_008",
      "kind": "illustrator_text",
      "label": "Illustrator text bottom right corner (small text)",
      "normalized_label": "illustrator text",
      "scene_layer": "interface",
      "frame_position": "bottom right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.85,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_card_ui_009",
      "kind": "card_type_icon",
      "label": "Stage 2 evolution symbol next to Japanese text on left side",
      "normalized_label": "evolution stage icon",
      "scene_layer": "interface",
      "frame_position": "top left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_001",
      "module": "subjects",
      "field_path": "identity",
      "claim": "This card's main scene subject is Mega Chandelure",
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
      "claim": "Mega Chandelure has a central purple spherical body",
      "value": "purple spherical body",
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
      "claim": "Mega Chandelure has black curved arms with purple flames",
      "value": "black curved arms with purple flames",
      "supporting_observation_ids": [
        "obs_creature_anatomy_002",
        "obs_creature_anatomy_003"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_003",
      "module": "creature_anatomy",
      "field_path": "body_regions.tail",
      "claim": "Mega Chandelure has a twisted black lower tail curling swirl",
      "value": "twisted black lower tail swirl",
      "supporting_observation_ids": [
        "obs_creature_anatomy_004"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_004",
      "module": "creature_anatomy",
      "field_path": "physical_features.eyes",
      "claim": "Mega Chandelure has dark eyes with glowing purple details",
      "value": "dark eyes with glowing purple details",
      "supporting_observation_ids": [
        "obs_creature_anatomy_005"
      ],
      "confidence": 0.93,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_005",
      "module": "creature_anatomy",
      "field_path": "physical_features.mouth",
      "claim": "Mega Chandelure has a dark smile visible on its mouth",
      "value": "dark smile",
      "supporting_observation_ids": [
        "obs_creature_anatomy_006"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_006",
      "module": "creature_anatomy",
      "field_path": "effects.aura",
      "claim": "Mega Chandelure is surrounded by a glowing purple aura",
      "value": "glowing purple aura",
      "supporting_observation_ids": [
        "obs_creature_anatomy_007"
      ],
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "setting",
      "claim": "The setting is a dark forest background",
      "value": "dark forest background",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_002",
      "module": "environment",
      "field_path": "lighting",
      "claim": "Dim lighting with spotlight effect is present around Mega Chandelure",
      "value": "dim spotlight lighting",
      "supporting_observation_ids": [
        "obs_environment_002"
      ],
      "confidence": 0.88,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_objects_and_props_001",
      "module": "objects_and_props",
      "field_path": "objects.effects",
      "claim": "Purple flame effects appear around Mega Chandelure's arms and body",
      "value": "purple flames",
      "supporting_observation_ids": [
        "obs_objects_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "Visible card name text in Japanese: メガシャンデラEX",
      "value": "メガシャンデラEX",
      "supporting_observation_ids": [
        "obs_card_ui_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_002",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text",
      "claim": "HP value visible as 350 in upper right corner",
      "value": "350",
      "supporting_observation_ids": [
        "obs_card_ui_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_003",
      "module": "card_ui_and_print_markers",
      "field_path": "energy_symbol",
      "claim": "Psychic energy symbol visible near HP",
      "value": "Psychic energy symbol",
      "supporting_observation_ids": [
        "obs_card_ui_003"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_004",
      "module": "card_ui_and_print_markers",
      "field_path": "attack_name",
      "claim": "Attack name in Japanese: ファントムメイズ",
      "value": "ファントムメイズ",
      "supporting_observation_ids": [
        "obs_card_ui_004"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_005",
      "module": "card_ui_and_print_markers",
      "field_path": "attack_damage",
      "claim": "Attack damage value visible as 130+",
      "value": "130+",
      "supporting_observation_ids": [
        "obs_card_ui_005"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_006",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol_and_collector_number",
      "claim": "Set symbol with M5 and collector number 113/081 SAR visible at bottom left",
      "value": "M5 and 113/081 SAR",
      "supporting_observation_ids": [
        "obs_card_ui_006"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_007",
      "module": "card_ui_and_print_markers",
      "field_path": "resistance_and_weakness",
      "claim": "Resistance and weakness values visible in bottom left interface area",
      "value": "resistance and weakness values",
      "supporting_observation_ids": [
        "obs_card_ui_007"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_008",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "Illustrator text visible in bottom right corner in small font",
      "value": "illustrator text",
      "supporting_observation_ids": [
        "obs_card_ui_008"
      ],
      "confidence": 0.85,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_009",
      "module": "card_ui_and_print_markers",
      "field_path": "evolution_stage_icon",
      "claim": "Stage 2 evolution symbol visible next to Japanese text on left side",
      "value": "stage 2 icon",
      "supporting_observation_ids": [
        "obs_card_ui_009"
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
        "black curved arms",
        "purple flames on arms",
        "purple spherical body",
        "twisted black tail swirl"
      ],
      "physical_features": [
        "dark glowing eyes",
        "dark smiling mouth"
      ],
      "pose": [
        "centered",
        "floating",
        "upright"
      ],
      "orientation": "forward",
      "action_state": [
        "stationary"
      ],
      "facial_evidence": {
        "eyes": "dark glow",
        "mouth": "smiling",
        "eyebrows": "not visible",
        "face_position": "center face visible",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [],
      "colors": [
        "black",
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
      "obs_creature_anatomy_001",
      "obs_creature_anatomy_002",
      "obs_creature_anatomy_003",
      "obs_creature_anatomy_004",
      "obs_creature_anatomy_005",
      "obs_creature_anatomy_006",
      "obs_creature_anatomy_007",
      "obs_objects_001",
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
      "dark forest background"
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
      "obs_environment_001",
      "obs_environment_002"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_objects_001",
      "label": "Purple flame effects around Mega Chandelure",
      "normalized_label": "purple flames",
      "object_type": "effect",
      "colors": [
        "purple"
      ],
      "material_appearance": [
        "glowing"
      ],
      "location": "around subject arms and body",
      "count_reference": "count_001",
      "confidence": 0.95
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "blue",
      "dark gray",
      "purple"
    ],
    "lighting": [
      "dim",
      "spotlight effect"
    ],
    "shadows": [
      "soft shadows around subject"
    ],
    "highlights": [
      "purple glowing highlights on flames"
    ],
    "composition": [
      "central subject",
      "circular body shape",
      "dynamic arm curves"
    ],
    "camera_angle": "frontal",
    "framing": "medium zoom, centered",
    "cropping": [
      "subject fully visible"
    ],
    "depth": "moderate depth with layered arms",
    "motion_cues": [],
    "motifs": [
      "ghostly flame motif"
    ],
    "repeated_shapes": [
      "swirling arms and tail"
    ],
    "style_cues": [
      "surrealism",
      "glowing effects"
    ],
    "supporting_observation_ids": [
      "obs_creature_anatomy_001",
      "obs_creature_anatomy_002",
      "obs_creature_anatomy_003",
      "obs_creature_anatomy_004",
      "obs_environment_002",
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
        "fact_creature_anatomy_006"
      ],
      "body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "central body",
          "feature": "body shape",
          "visibility": "visible",
          "colors": [
            "purple"
          ],
          "details": [
            "spherical"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_001"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "arms",
          "feature": "curved arms",
          "visibility": "visible",
          "colors": [
            "black"
          ],
          "details": [
            "black",
            "curved",
            "with purple flame tips"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_002",
            "obs_creature_anatomy_003"
          ],
          "confidence": 0.97
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "tail",
          "feature": "twisting tail swirl",
          "visibility": "visible",
          "colors": [
            "black"
          ],
          "details": [
            "twisted swirl shape"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_004"
          ],
          "confidence": 0.95
        }
      ],
      "physical_features": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "face",
          "feature": "eyes",
          "visibility": "visible",
          "colors": [
            "dark",
            "purple glow"
          ],
          "details": [
            "dark eyes with purple glowing accents"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_005"
          ],
          "confidence": 0.93
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "face",
          "feature": "mouth",
          "visibility": "visible",
          "colors": [
            "dark"
          ],
          "details": [
            "dark smiling mouth"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_006"
          ],
          "confidence": 0.9
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
      "effects": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "glowing purple aura",
          "details": [
            "purple glowing aura surrounding body"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_007"
          ],
          "confidence": 0.92
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
        "fact_objects_and_props_001"
      ],
      "object_observation_ids": [
        "obs_objects_001"
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
        "fact_creature_anatomy_001",
        "fact_creature_anatomy_002",
        "fact_creature_anatomy_003"
      ],
      "observation_ids": [
        "obs_creature_anatomy_001",
        "obs_creature_anatomy_002",
        "obs_creature_anatomy_004"
      ]
    },
    "color_and_light": {
      "fact_ids": [
        "fact_environment_002"
      ],
      "observation_ids": [
        "obs_environment_002"
      ]
    },
    "visual_effects": {
      "fact_ids": [
        "fact_creature_anatomy_006",
        "fact_objects_and_props_001"
      ],
      "observation_ids": [
        "obs_creature_anatomy_007",
        "obs_objects_001"
      ]
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
        "fact_card_ui_and_print_markers_009"
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
        "obs_card_ui_006"
      ],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [],
      "bottom_line_text_observation_ids": [],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [
        "obs_card_ui_003"
      ],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_card_ui_008"
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
        "purple flame",
        "floating Pokemon",
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
      "semantic_fact_id": "sem_fact_001",
      "category": "scene_type",
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
          "dark forest background"
        ],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.9,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "sem_fact_002",
      "category": "expression",
      "label": "smiling",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_creature_anatomy_006"
      ],
      "evidence": {
        "mouth": [
          "smiling"
        ],
        "eyes": [],
        "eyebrows": [],
        "facial_features": [
          "mouth smile"
        ],
        "body_language": [],
        "body_position": [],
        "motion_state": [],
        "environment": [],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.9,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "sem_fact_003",
      "category": "action",
      "label": "floating",
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
          "floating pose"
        ],
        "body_position": [
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
      "confidence": 0.99,
      "uncertainty": "none"
    }
  ],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "purple flame",
      "supporting_observation_ids": [
        "obs_objects_001"
      ]
    },
    {
      "term": "floating Pokemon",
      "supporting_observation_ids": [
        "obs_subject_001"
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
        "concept": "centered",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "dark forest",
        "source_observation_ids": [
          "obs_environment_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.9
      },
      {
        "concept": "flame",
        "source_observation_ids": [
          "obs_creature_anatomy_002",
          "obs_creature_anatomy_003",
          "obs_objects_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
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
        "confidence": 0.9
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
          "obs_creature_anatomy_003",
          "obs_objects_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "smiling",
        "source_observation_ids": [
          "obs_creature_anatomy_006"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.9
      },
      {
        "concept": "spiral motif",
        "source_observation_ids": [
          "obs_creature_anatomy_004"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
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

### GV-PK-JPN-M5-101 - Mega Excadrill ex

- Branch: `pokemon`
- Review status: `needs_review`
- Description confidence: `0.99`
- Attribute confidence: `0.98`
- Cost USD: `0.0111776`
- Artwork observations: `11`
- Card UI / print-marker observations: `8`
- Card UI module evidence references: `7`
- Derived digest: Fact digest. Scene subjects: Mega Excadrill.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Excadrill | mega excadrill | scene_subject | foreground | salient | 0.99 |
| body | body | creature_anatomy | foreground | salient | 0.99 |
| head | head | creature_anatomy | foreground | salient | 0.99 |
| drill nose horn | drill nose horn | creature_anatomy | foreground | salient | 0.98 |
| arms with striped pattern | arms with striped pattern | creature_anatomy | foreground | salient | 0.98 |
| claws | claws | creature_anatomy | foreground | salient | 0.97 |
| red markings on back and arms | red markings on back and arms | creature_anatomy | foreground | salient | 0.98 |
| eye with white sclera and black pupil | eye with white sclera and black pupil | creature_anatomy | foreground | salient | 0.95 |
| tail | tail | creature_anatomy | foreground | salient | 0.95 |
| pose diagonal upward right | pose diagonal upward right | creature_anatomy | foreground | salient | 0.95 |
| dark background with abstract red and yellow lines | dark background abstract red yellow lines | environment | background | salient | 0.9 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| メガドリュウズex | card_ui_text | top | visible | 0.99 |
| HP 340 | card_ui_text | top_right | visible | 0.99 |
| steel type symbol | card_ui_symbol | top_right_next_to_hp | visible | 0.99 |
| energy cost symbols for attack 1 (2 steel) | card_ui_symbol | mid_left_under_art | visible | 0.99 |
| energy cost symbols for attack 2 (3 steel) | card_ui_symbol | mid_left_below_attack_1 | visible | 0.99 |
| Illus. Keisuke Azuma | illustrator_text | bottom_left | visible | 0.99 |
| J M5 | set_symbol | bottom_left | visible | 0.99 |
| 101/081 SR | collector_number | bottom_left | visible | 0.99 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | The primary scene subject is Mega Excadrill | obs_subject_001 | 0.99 |
| fact_anatomy_001 | creature_anatomy | Mega Excadrill has visible body | obs_creature_anatomy_001 | 0.99 |
| fact_anatomy_002 | creature_anatomy | Mega Excadrill has visible head | obs_creature_anatomy_002 | 0.99 |
| fact_anatomy_003 | creature_anatomy | Mega Excadrill has a drill shape nose horn | obs_creature_anatomy_003 | 0.98 |
| fact_anatomy_004 | creature_anatomy | Mega Excadrill's arms have black and red striped pattern | obs_creature_anatomy_004 | 0.98 |
| fact_anatomy_005 | creature_anatomy | Mega Excadrill has visible claws | obs_creature_anatomy_005 | 0.97 |
| fact_anatomy_006 | creature_anatomy | Mega Excadrill has red markings on back and arms | obs_creature_anatomy_006 | 0.98 |
| fact_anatomy_007 | creature_anatomy | Mega Excadrill's eye is visible with white sclera and black pupil | obs_creature_anatomy_007 | 0.95 |
| fact_anatomy_008 | creature_anatomy | Mega Excadrill has a visible tail | obs_creature_anatomy_008 | 0.95 |
| fact_anatomy_009 | creature_anatomy | Mega Excadrill is diagonally oriented upward to right | obs_creature_pose_001 | 0.95 |
| fact_environment_001 | environment | Background is dark with abstract red and yellow lines | obs_environment_001 | 0.9 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_001 | Card name visible in Japanese text 'メガドリュウズex' | obs_card_ui_name_text_001 | 0.99 |
| fact_card_ui_002 | Card HP text visible 'HP 340' | obs_card_ui_hp_text_001 | 0.99 |
| fact_card_ui_003 | Set symbol visible as 'J M5' | obs_card_ui_set_symbol_001 | 0.99 |
| fact_card_ui_004 | Collector number visible '101/081 SR' | obs_card_ui_collector_number_001 | 0.99 |
| fact_card_ui_005 | Illustrator text visible 'Illus. Keisuke Azuma' | obs_card_ui_illustrator_text_001 | 0.99 |

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
  "bottom_line_text_observation_ids": [],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [
    "obs_card_ui_energy_cost_001",
    "obs_card_ui_energy_cost_002"
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
| composition | complete | low | high |  |
| color_and_light | complete | low | high |  |
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
| body | obs_creature_anatomy_001 |
| head | obs_creature_anatomy_002 |
| drill nose horn | obs_creature_anatomy_003 |
| arms with striped pattern | obs_creature_anatomy_004 |
| claws | obs_creature_anatomy_005 |
| red markings on back and arms | obs_creature_anatomy_006 |
| eye with white sclera and black pupil | obs_creature_anatomy_007 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| diagonal composition | obs_creature_pose_001 | deterministic_rule | 0.95 |
| diagonal upward right | obs_creature_pose_001, obs_subject_001 | deterministic_rule | 0.99 |
| glowing highlights | obs_creature_anatomy_003 | deterministic_rule | 0.92 |
| upward-right orientation | obs_creature_pose_001, obs_subject_001 | deterministic_rule | 0.99 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Excadrill.
- Quality flags: `potential_module_review_conflicts_with_entries`
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
      "salience": "salient",
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
      "salience": "salient",
      "confidence": 0.99,
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
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_003",
      "kind": "creature_anatomy",
      "label": "drill nose horn",
      "normalized_label": "drill nose horn",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_004",
      "kind": "creature_anatomy",
      "label": "arms with striped pattern",
      "normalized_label": "arms with striped pattern",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_005",
      "kind": "creature_anatomy",
      "label": "claws",
      "normalized_label": "claws",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_006",
      "kind": "creature_anatomy",
      "label": "red markings on back and arms",
      "normalized_label": "red markings on back and arms",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_007",
      "kind": "creature_anatomy",
      "label": "eye with white sclera and black pupil",
      "normalized_label": "eye with white sclera and black pupil",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_008",
      "kind": "creature_anatomy",
      "label": "tail",
      "normalized_label": "tail",
      "scene_layer": "foreground",
      "frame_position": "bottom_right",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_pose_001",
      "kind": "creature_anatomy",
      "label": "pose diagonal upward right",
      "normalized_label": "pose diagonal upward right",
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
      "label": "dark background with abstract red and yellow lines",
      "normalized_label": "dark background abstract red yellow lines",
      "scene_layer": "background",
      "frame_position": "full_frame",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_text_001",
      "kind": "card_ui_text",
      "label": "メガドリュウズex",
      "normalized_label": "jp_megadoryuuzu_ex",
      "scene_layer": "ui",
      "frame_position": "top",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_hp_text_001",
      "kind": "card_ui_text",
      "label": "HP 340",
      "normalized_label": "hp_340",
      "scene_layer": "ui",
      "frame_position": "top_right",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_type_symbol_001",
      "kind": "card_ui_symbol",
      "label": "steel type symbol",
      "normalized_label": "steel_type_symbol",
      "scene_layer": "ui",
      "frame_position": "top_right_next_to_hp",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_energy_cost_001",
      "kind": "card_ui_symbol",
      "label": "energy cost symbols for attack 1 (2 steel)",
      "normalized_label": "energy_cost_2_steel",
      "scene_layer": "ui",
      "frame_position": "mid_left_under_art",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_energy_cost_002",
      "kind": "card_ui_symbol",
      "label": "energy cost symbols for attack 2 (3 steel)",
      "normalized_label": "energy_cost_3_steel",
      "scene_layer": "ui",
      "frame_position": "mid_left_below_attack_1",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_illustrator_text_001",
      "kind": "illustrator_text",
      "label": "Illus. Keisuke Azuma",
      "normalized_label": "illustrator_keisuke_azuma",
      "scene_layer": "ui",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_symbol_001",
      "kind": "set_symbol",
      "label": "J M5",
      "normalized_label": "jpn-m5_set_symbol",
      "scene_layer": "ui",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_collector_number_001",
      "kind": "collector_number",
      "label": "101/081 SR",
      "normalized_label": "101_81_sr",
      "scene_layer": "ui",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_001",
      "module": "subjects",
      "field_path": "scene_subject.identity",
      "claim": "The primary scene subject is Mega Excadrill",
      "value": "Mega Excadrill",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_anatomy_001",
      "module": "creature_anatomy",
      "field_path": "anatomy.body",
      "claim": "Mega Excadrill has visible body",
      "value": "body",
      "supporting_observation_ids": [
        "obs_creature_anatomy_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_anatomy_002",
      "module": "creature_anatomy",
      "field_path": "anatomy.head",
      "claim": "Mega Excadrill has visible head",
      "value": "head",
      "supporting_observation_ids": [
        "obs_creature_anatomy_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_anatomy_003",
      "module": "creature_anatomy",
      "field_path": "anatomy.drill_nose_horn",
      "claim": "Mega Excadrill has a drill shape nose horn",
      "value": "drill nose horn",
      "supporting_observation_ids": [
        "obs_creature_anatomy_003"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_anatomy_004",
      "module": "creature_anatomy",
      "field_path": "anatomy.arms.pattern",
      "claim": "Mega Excadrill's arms have black and red striped pattern",
      "value": "black and red striped pattern",
      "supporting_observation_ids": [
        "obs_creature_anatomy_004"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_anatomy_005",
      "module": "creature_anatomy",
      "field_path": "anatomy.claws",
      "claim": "Mega Excadrill has visible claws",
      "value": "claws",
      "supporting_observation_ids": [
        "obs_creature_anatomy_005"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_anatomy_006",
      "module": "creature_anatomy",
      "field_path": "anatomy.body_markings",
      "claim": "Mega Excadrill has red markings on back and arms",
      "value": "red markings",
      "supporting_observation_ids": [
        "obs_creature_anatomy_006"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_anatomy_007",
      "module": "creature_anatomy",
      "field_path": "anatomy.eye",
      "claim": "Mega Excadrill's eye is visible with white sclera and black pupil",
      "value": "eye with white sclera and black pupil",
      "supporting_observation_ids": [
        "obs_creature_anatomy_007"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_anatomy_008",
      "module": "creature_anatomy",
      "field_path": "anatomy.tail",
      "claim": "Mega Excadrill has a visible tail",
      "value": "tail",
      "supporting_observation_ids": [
        "obs_creature_anatomy_008"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_anatomy_009",
      "module": "creature_anatomy",
      "field_path": "pose.orientation",
      "claim": "Mega Excadrill is diagonally oriented upward to right",
      "value": "diagonal upward right",
      "supporting_observation_ids": [
        "obs_creature_pose_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "background",
      "claim": "Background is dark with abstract red and yellow lines",
      "value": "dark background with abstract red and yellow lines",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "Card name visible in Japanese text 'メガドリュウズex'",
      "value": "メガドリュウズex",
      "supporting_observation_ids": [
        "obs_card_ui_name_text_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_002",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text",
      "claim": "Card HP text visible 'HP 340'",
      "value": "HP 340",
      "supporting_observation_ids": [
        "obs_card_ui_hp_text_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_003",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "Set symbol visible as 'J M5'",
      "value": "J M5",
      "supporting_observation_ids": [
        "obs_card_ui_set_symbol_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_004",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "Collector number visible '101/081 SR'",
      "value": "101/081 SR",
      "supporting_observation_ids": [
        "obs_card_ui_collector_number_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_005",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "Illustrator text visible 'Illus. Keisuke Azuma'",
      "value": "Illus. Keisuke Azuma",
      "supporting_observation_ids": [
        "obs_card_ui_illustrator_text_001"
      ],
      "confidence": 0.99,
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
        "arms with striped pattern",
        "body",
        "claws",
        "drill nose horn",
        "eye with white sclera and black pupil",
        "head",
        "red markings on back and arms",
        "tail"
      ],
      "physical_features": [
        "black and red stripes",
        "red markings"
      ],
      "pose": [
        "diagonal upward right"
      ],
      "orientation": "upward-right",
      "action_state": [],
      "facial_evidence": {
        "eyes": "visible with white sclera and black pupil",
        "mouth": "not visible",
        "eyebrows": "not visible",
        "face_position": "front left side visible",
        "other_visible_evidence": [
          "face partially visible"
        ]
      },
      "clothing_or_accessories": [],
      "colors": [
        "black",
        "grey",
        "pink",
        "red",
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
      "obs_creature_anatomy_001",
      "obs_creature_anatomy_002",
      "obs_creature_anatomy_003",
      "obs_creature_anatomy_004",
      "obs_creature_anatomy_005",
      "obs_creature_anatomy_006",
      "obs_creature_anatomy_007",
      "obs_creature_anatomy_008",
      "obs_creature_pose_001",
      "obs_subject_001"
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
  "objects_and_props": [],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "grey",
      "pink",
      "red",
      "white",
      "yellow"
    ],
    "lighting": [
      "bright highlights on drill horn",
      "diffuse lighting"
    ],
    "shadows": [
      "soft shadows under body parts"
    ],
    "highlights": [
      "bright highlights on metallic surfaces"
    ],
    "composition": [
      "central large figure",
      "diagonal composition from lower left to upper right"
    ],
    "camera_angle": "slightly above subject",
    "framing": "tight framing on subject",
    "cropping": [],
    "depth": "shallow depth, subject prominent",
    "motion_cues": [],
    "motifs": [
      "striped pattern on arms"
    ],
    "repeated_shapes": [
      "triangular spikes on back"
    ],
    "style_cues": [
      "digital illustration",
      "high contrast colors"
    ],
    "supporting_observation_ids": [
      "obs_creature_anatomy_003",
      "obs_creature_anatomy_004",
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
        "fact_anatomy_001",
        "fact_anatomy_002",
        "fact_anatomy_003",
        "fact_anatomy_004",
        "fact_anatomy_005",
        "fact_anatomy_006",
        "fact_anatomy_007",
        "fact_anatomy_008",
        "fact_anatomy_009"
      ],
      "body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "body",
          "feature": "body",
          "visibility": "visible",
          "colors": [
            "black",
            "grey"
          ],
          "details": [
            "metallic",
            "rounded shapes"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_001"
          ],
          "confidence": 0.99
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "feature": "head",
          "visibility": "visible",
          "colors": [
            "black",
            "grey"
          ],
          "details": [
            "helmet-like",
            "metallic"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_002"
          ],
          "confidence": 0.99
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "nose horn",
          "feature": "drill nose horn",
          "visibility": "visible",
          "colors": [
            "black",
            "grey"
          ],
          "details": [
            "spiral drill shape"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_003"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "arms",
          "feature": "striped pattern",
          "visibility": "visible",
          "colors": [
            "black",
            "red"
          ],
          "details": [
            "striped red and black pattern"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_004"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "arms",
          "feature": "claws",
          "visibility": "visible",
          "colors": [
            "black"
          ],
          "details": [
            "sharp claws"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_005"
          ],
          "confidence": 0.97
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "back and arms",
          "feature": "red markings",
          "visibility": "visible",
          "colors": [
            "red"
          ],
          "details": [
            "flame-like markings"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_006"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "eye",
          "feature": "eye",
          "visibility": "visible",
          "colors": [
            "black",
            "pink",
            "white"
          ],
          "details": [
            "pink eyelid",
            "visible sclera and black pupil"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_007"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "tail",
          "feature": "tail",
          "visibility": "visible",
          "colors": [
            "black",
            "grey"
          ],
          "details": [
            "striped tail tip"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_008"
          ],
          "confidence": 0.95
        }
      ],
      "physical_features": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "arms",
          "feature": "striped pattern",
          "visibility": "visible",
          "colors": [
            "black",
            "red"
          ],
          "details": [
            "striped red and black arms"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_004"
          ],
          "confidence": 0.98
        }
      ],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "diagonal upward right"
          ],
          "orientation": "upward-right",
          "action_state": [],
          "supporting_observation_ids": [
            "obs_creature_pose_001"
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
      "fact_ids": [
        "fact_anatomy_009"
      ],
      "observation_ids": [
        "obs_creature_pose_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_creature_anatomy_003",
        "obs_creature_anatomy_004",
        "obs_creature_anatomy_006",
        "obs_environment_001"
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
      "bottom_line_text_observation_ids": [],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [
        "obs_card_ui_energy_cost_001",
        "obs_card_ui_energy_cost_002"
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
        "body",
        "head",
        "drill nose horn",
        "arms with striped pattern",
        "claws",
        "red markings on back and arms",
        "eye with white sclera and black pupil"
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
      "term": "body",
      "supporting_observation_ids": [
        "obs_creature_anatomy_001"
      ]
    },
    {
      "term": "head",
      "supporting_observation_ids": [
        "obs_creature_anatomy_002"
      ]
    },
    {
      "term": "drill nose horn",
      "supporting_observation_ids": [
        "obs_creature_anatomy_003"
      ]
    },
    {
      "term": "arms with striped pattern",
      "supporting_observation_ids": [
        "obs_creature_anatomy_004"
      ]
    },
    {
      "term": "claws",
      "supporting_observation_ids": [
        "obs_creature_anatomy_005"
      ]
    },
    {
      "term": "red markings on back and arms",
      "supporting_observation_ids": [
        "obs_creature_anatomy_006"
      ]
    },
    {
      "term": "eye with white sclera and black pupil",
      "supporting_observation_ids": [
        "obs_creature_anatomy_007"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "diagonal composition",
        "source_observation_ids": [
          "obs_creature_pose_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "diagonal upward right",
        "source_observation_ids": [
          "obs_creature_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "glowing highlights",
        "source_observation_ids": [
          "obs_creature_anatomy_003"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "upward-right orientation",
        "source_observation_ids": [
          "obs_creature_pose_001",
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
- Attribute confidence: `0.92`
- Cost USD: `0.0106608`
- Artwork observations: `10`
- Card UI / print-marker observations: `6`
- Card UI module evidence references: `6`
- Derived digest: Fact digest. Scene subjects: Mega Darkrai. Visible observations: mega darkrai, dark body sinewy tendrils, head purple right eye glowing, face frontal glowing right eye closed mouth, right eye purple glowing left eye indistinct, branching claw tendrils, color dark gray black light gray green spots, pose floating spreading. Semantic facts: floating, dark forest.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Darkrai Pokémon | mega darkrai | scene_subject | foreground | high | 0.99 |
| Dark body with sinewy, dark tendrils | dark body sinewy tendrils | creature_body_region | foreground | high | 0.98 |
| Central head with purple glowing right eye | head purple right eye glowing | creature_body_region | foreground | high | 0.99 |
| Face frontal with glowing right eye and closed mouth outline | face frontal glowing right eye closed mouth | creature_body_region | foreground | high | 0.97 |
| Right eye glowing purple, left eye indistinct | right eye purple glowing left eye indistinct | creature_body_region | foreground | high | 0.95 |
| Multiple branching claw-like tendrils extending outward | branching claw tendrils | creature_body_region | foreground | high | 0.96 |
| Body dark gray to black with lighter gray and greenish moss-like spots | color dark gray black light gray green spots | color | foreground | high | 0.98 |
| Body floating and spreading outwards in many directions | pose floating spreading | pose | foreground | high | 0.9 |
| Dark forest background with twisted branches | environment dark forest twisted branches | environment | background | medium | 0.8 |
| Glowing eye-like objects embedded in tendrils and background | glowing eye-like objects | object | foreground | medium | 0.85 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| Card name text in Japanese: メガダークライex | card_ui_text | top | fully_visible | 1 |
| HP text: 280 | card_ui_text | top_right | fully_visible | 1 |
| Dark-type Pokémon symbol (purple circle with crescent) | card_ui_symbol | top_right | fully_visible | 1 |
| Attack names and text in Japanese text visible below artwork | card_ui_text | below_artwork | fully_visible | 0.95 |
| Illustrator credit: AKIRA EGAWA | illustrator_text | bottom_left | fully_visible | 1 |
| Set code and card number: jpn-m5 114/081 SAR | card_ui_text | bottom_right | fully_visible | 1 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subj_001 | subjects | The main visible scene subject is Mega Darkrai Pokémon | obs_subject_001 | 0.99 |
| fact_creature_body_001 | creature_anatomy | Darkrai's body has multiple branching tendrils and claw-like extensions | obs_creature_body_001, obs_creature_limbs_001 | 0.96 |
| fact_creature_head_001 | creature_anatomy | Head with frontal face and glowing purple right eye is visible | obs_creature_eye_001, obs_creature_face_001, obs_creature_head_001 | 0.97 |
| fact_creature_color_001 | creature_anatomy | Darkrai's body colors are dark gray, black, lighter gray with greenish moss-like spots | obs_creature_color_001 | 0.98 |
| fact_creature_pose_001 | creature_anatomy | Mega Darkrai is floating with tendrils spreading outward | obs_creature_pose_001 | 0.9 |
| fact_environment_001 | environment | Background setting depicts a dark forest with twisted branches | obs_environment_001 | 0.8 |
| fact_objects_001 | objects_and_props | Glowing eye-like objects appear embedded in tendrils and background | obs_objects_001 | 0.85 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_name_001 | Card name text in Japanese 'メガダークライex' is visible at top | obs_card_ui_name_001 | 1 |
| fact_card_ui_hp_001 | Card HP text displays 280 at top right | obs_card_ui_hp_001 | 1 |
| fact_card_ui_type_001 | Dark-type Pokémon symbol visible at top right | obs_card_ui_type_001 | 1 |
| fact_card_ui_attack_001 | Japanese attack names and descriptions visible below artwork area | obs_card_ui_attacks_001 | 0.95 |
| fact_card_ui_illustrator_001 | Illustrator credit text 'AKIRA EGAWA' visible at bottom left | obs_card_ui_illustrator_001 | 1 |
| fact_card_ui_set_code_001 | Set code and collector number 'jpn-m5 114/081 SAR' visible bottom right | obs_card_ui_set_code_001 | 1 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_attack_001",
    "fact_card_ui_hp_001",
    "fact_card_ui_illustrator_001",
    "fact_card_ui_name_001",
    "fact_card_ui_set_code_001",
    "fact_card_ui_type_001"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_name_001"
  ],
  "hp_text_observation_ids": [
    "obs_card_ui_hp_001"
  ],
  "collector_number_observation_ids": [
    "obs_card_ui_set_code_001"
  ],
  "set_symbol_observation_ids": [],
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
  "other_print_marker_observation_ids": [
    "obs_card_ui_attacks_001"
  ]
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
| objects_and_props | complete | low | medium |  |
| environment | complete | low | medium |  |
| composition | none_visible | none | not_applicable |  |
| color_and_light | none_visible | none | not_applicable |  |
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
| semfact_001 | state | floating | obs_subject_001 | obs_creature_pose_001 | floating floating | 0.9 |
| semfact_002 | environment | dark forest |  | obs_environment_001 | dark forest twisted branches | 0.8 |

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
| dark forest background | obs_environment_001 |
| floating tendrils | obs_creature_pose_001 |
| purple glowing eye | obs_creature_eye_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| dark forest | obs_environment_001 | deterministic_rule | 0.8 |
| floating | obs_creature_pose_001, obs_subject_001 | deterministic_rule | 0.99 |
| forest | obs_environment_001 | deterministic_rule | 0.92 |
| frontal orientation | obs_creature_pose_001, obs_subject_001 | deterministic_rule | 0.99 |
| glowing highlights | obs_creature_eye_001, obs_creature_face_001, obs_creature_head_001, obs_objects_001 | deterministic_rule | 0.99 |
| right orientation | obs_creature_eye_001, obs_creature_face_001, obs_creature_head_001 | deterministic_rule | 0.99 |
| spreading limbs | obs_subject_001 | deterministic_rule | 0.99 |
| spreading tendrils | obs_creature_pose_001 | deterministic_rule | 0.9 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Darkrai. Visible observations: mega darkrai, dark body sinewy tendrils, head purple right eye glowing, face frontal glowing right eye closed mouth, right eye purple glowing left eye indistinct, branching claw tendrils, color dark gray black light gray green spots, pose floating spreading. Semantic facts: floating, dark forest.
- Quality flags: `none`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "Mega Darkrai Pokémon",
      "normalized_label": "mega darkrai",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_body_001",
      "kind": "creature_body_region",
      "label": "Dark body with sinewy, dark tendrils",
      "normalized_label": "dark body sinewy tendrils",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_head_001",
      "kind": "creature_body_region",
      "label": "Central head with purple glowing right eye",
      "normalized_label": "head purple right eye glowing",
      "scene_layer": "foreground",
      "frame_position": "center_top",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_face_001",
      "kind": "creature_body_region",
      "label": "Face frontal with glowing right eye and closed mouth outline",
      "normalized_label": "face frontal glowing right eye closed mouth",
      "scene_layer": "foreground",
      "frame_position": "center_top",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_eye_001",
      "kind": "creature_body_region",
      "label": "Right eye glowing purple, left eye indistinct",
      "normalized_label": "right eye purple glowing left eye indistinct",
      "scene_layer": "foreground",
      "frame_position": "head",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_limbs_001",
      "kind": "creature_body_region",
      "label": "Multiple branching claw-like tendrils extending outward",
      "normalized_label": "branching claw tendrils",
      "scene_layer": "foreground",
      "frame_position": "center_bottom",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_color_001",
      "kind": "color",
      "label": "Body dark gray to black with lighter gray and greenish moss-like spots",
      "normalized_label": "color dark gray black light gray green spots",
      "scene_layer": "foreground",
      "frame_position": "all",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_pose_001",
      "kind": "pose",
      "label": "Body floating and spreading outwards in many directions",
      "normalized_label": "pose floating spreading",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "Dark forest background with twisted branches",
      "normalized_label": "environment dark forest twisted branches",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.8,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_objects_001",
      "kind": "object",
      "label": "Glowing eye-like objects embedded in tendrils and background",
      "normalized_label": "glowing eye-like objects",
      "scene_layer": "foreground",
      "frame_position": "scattered",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.85,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_card_ui_name_001",
      "kind": "card_ui_text",
      "label": "Card name text in Japanese: メガダークライex",
      "normalized_label": "card name mega darkrai ex",
      "scene_layer": "card_ui",
      "frame_position": "top",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_hp_001",
      "kind": "card_ui_text",
      "label": "HP text: 280",
      "normalized_label": "hp 280",
      "scene_layer": "card_ui",
      "frame_position": "top_right",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_type_001",
      "kind": "card_ui_symbol",
      "label": "Dark-type Pokémon symbol (purple circle with crescent)",
      "normalized_label": "dark type symbol",
      "scene_layer": "card_ui",
      "frame_position": "top_right",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_attacks_001",
      "kind": "card_ui_text",
      "label": "Attack names and text in Japanese text visible below artwork",
      "normalized_label": "attack text visible",
      "scene_layer": "card_ui",
      "frame_position": "below_artwork",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_illustrator_001",
      "kind": "illustrator_text",
      "label": "Illustrator credit: AKIRA EGAWA",
      "normalized_label": "illustrator akira egawa",
      "scene_layer": "card_ui",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_code_001",
      "kind": "card_ui_text",
      "label": "Set code and card number: jpn-m5 114/081 SAR",
      "normalized_label": "set jpn-m5 114/081 SAR",
      "scene_layer": "card_ui",
      "frame_position": "bottom_right",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subj_001",
      "module": "subjects",
      "field_path": "scene_subject.identity",
      "claim": "The main visible scene subject is Mega Darkrai Pokémon",
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
      "field_path": "body_regions.tendrils",
      "claim": "Darkrai's body has multiple branching tendrils and claw-like extensions",
      "value": "branching claw tendrils",
      "supporting_observation_ids": [
        "obs_creature_body_001",
        "obs_creature_limbs_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_head_001",
      "module": "creature_anatomy",
      "field_path": "body_regions.head",
      "claim": "Head with frontal face and glowing purple right eye is visible",
      "value": "head with glowing purple right eye",
      "supporting_observation_ids": [
        "obs_creature_eye_001",
        "obs_creature_face_001",
        "obs_creature_head_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_color_001",
      "module": "creature_anatomy",
      "field_path": "physical_features.colors",
      "claim": "Darkrai's body colors are dark gray, black, lighter gray with greenish moss-like spots",
      "value": "dark gray black light gray green spots",
      "supporting_observation_ids": [
        "obs_creature_color_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_pose_001",
      "module": "creature_anatomy",
      "field_path": "pose_orientation.pose",
      "claim": "Mega Darkrai is floating with tendrils spreading outward",
      "value": "floating spreading tendrils",
      "supporting_observation_ids": [
        "obs_creature_pose_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "setting",
      "claim": "Background setting depicts a dark forest with twisted branches",
      "value": "dark forest twisted branches",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.8,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_objects_001",
      "module": "objects_and_props",
      "field_path": "objects.glowing_eye-like",
      "claim": "Glowing eye-like objects appear embedded in tendrils and background",
      "value": "glowing eye-like objects",
      "supporting_observation_ids": [
        "obs_objects_001"
      ],
      "confidence": 0.85,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_card_ui_name_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "Card name text in Japanese 'メガダークライex' is visible at top",
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
      "field_path": "hp_text",
      "claim": "Card HP text displays 280 at top right",
      "value": "280",
      "supporting_observation_ids": [
        "obs_card_ui_hp_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_type_001",
      "module": "card_ui_and_print_markers",
      "field_path": "energy_symbol",
      "claim": "Dark-type Pokémon symbol visible at top right",
      "value": "dark type symbol",
      "supporting_observation_ids": [
        "obs_card_ui_type_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_attack_001",
      "module": "card_ui_and_print_markers",
      "field_path": "attack_text",
      "claim": "Japanese attack names and descriptions visible below artwork area",
      "value": "visible attack text",
      "supporting_observation_ids": [
        "obs_card_ui_attacks_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_illustrator_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "Illustrator credit text 'AKIRA EGAWA' visible at bottom left",
      "value": "AKIRA EGAWA",
      "supporting_observation_ids": [
        "obs_card_ui_illustrator_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_set_code_001",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number_and_set_code",
      "claim": "Set code and collector number 'jpn-m5 114/081 SAR' visible bottom right",
      "value": "jpn-m5 114/081 SAR",
      "supporting_observation_ids": [
        "obs_card_ui_set_code_001"
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
      "identity_confidence": 0.99,
      "anatomy": [
        "body",
        "head",
        "limbs",
        "tendrils"
      ],
      "physical_features": [
        "dark colored body",
        "glowing right eye",
        "moss-like green spots"
      ],
      "pose": [
        "floating",
        "spreading limbs"
      ],
      "orientation": "frontal",
      "action_state": [],
      "facial_evidence": {
        "eyes": "right eye glowing purple; left eye indistinct",
        "mouth": "closed mouth outline visible",
        "eyebrows": "not visible",
        "face_position": "frontal",
        "other_visible_evidence": [
          "white central facial marking"
        ]
      },
      "clothing_or_accessories": [],
      "colors": [
        "black",
        "dark gray",
        "green",
        "light gray"
      ],
      "visibility": "fully_visible"
    }
  ],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [],
  "scene_layers": {
    "foreground": [
      "obs_creature_body_001",
      "obs_creature_color_001",
      "obs_creature_eye_001",
      "obs_creature_face_001",
      "obs_creature_head_001",
      "obs_creature_limbs_001",
      "obs_creature_pose_001",
      "obs_objects_001",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_environment_001"
    ]
  },
  "environment": {
    "setting": [
      "dark forest",
      "twisted branches"
    ],
    "indoor_outdoor": "outdoor",
    "sky": [],
    "ground": [],
    "terrain": [
      "forest terrain"
    ],
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
      "label": "glowing eye-like objects",
      "normalized_label": "glowing eye-like objects",
      "object_type": "abstract object",
      "colors": [
        "yellowish green"
      ],
      "material_appearance": [
        "glowing"
      ],
      "location": "embedded in tendrils and background",
      "count_reference": "",
      "confidence": 0.85
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "dark grays",
      "greenish accents",
      "light gray",
      "purple eye glow"
    ],
    "lighting": [
      "dim ambient",
      "highlight on right eye"
    ],
    "shadows": [
      "soft shadows on tendrils"
    ],
    "highlights": [
      "eye glow and white facial mark"
    ],
    "composition": [
      "central subject",
      "dark background",
      "radial spreading tendrils"
    ],
    "camera_angle": "frontal",
    "framing": "tight around subject with card UI borders",
    "cropping": [],
    "depth": "moderate depth with some background visibility",
    "motion_cues": [
      "implied spreading and floating"
    ],
    "motifs": [
      "dark, nightmarish forest",
      "twisted branches"
    ],
    "repeated_shapes": [
      "branching tendrils",
      "eye-like spots"
    ],
    "style_cues": [
      "dark",
      "textured brush strokes"
    ],
    "supporting_observation_ids": [
      "obs_creature_body_001",
      "obs_creature_eye_001",
      "obs_creature_head_001",
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
        "fact_subj_001"
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
        "fact_creature_color_001",
        "fact_creature_head_001",
        "fact_creature_pose_001"
      ],
      "body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "body",
          "feature": "branching claw-like tendrils",
          "visibility": "fully_visible",
          "colors": [
            "black",
            "dark gray",
            "green",
            "light gray"
          ],
          "details": [
            "claw-shaped",
            "moss-like spotting",
            "sinewy"
          ],
          "supporting_observation_ids": [
            "obs_creature_body_001",
            "obs_creature_color_001",
            "obs_creature_limbs_001"
          ],
          "confidence": 0.96
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "feature": "head with glowing purple right eye",
          "visibility": "fully_visible",
          "colors": [
            "black",
            "gray",
            "purple"
          ],
          "details": [
            "closed mouth outline",
            "frontal face",
            "glowing right eye",
            "white central facial marking"
          ],
          "supporting_observation_ids": [
            "obs_creature_eye_001",
            "obs_creature_face_001",
            "obs_creature_head_001"
          ],
          "confidence": 0.97
        }
      ],
      "physical_features": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "face",
          "feature": "eyes",
          "visibility": "fully_visible",
          "colors": [
            "purple"
          ],
          "details": [
            "left eye indistinct",
            "right eye glowing purple"
          ],
          "supporting_observation_ids": [
            "obs_creature_eye_001"
          ],
          "confidence": 0.95
        }
      ],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "floating",
            "spreading tendrils"
          ],
          "orientation": "frontal",
          "action_state": [],
          "supporting_observation_ids": [
            "obs_creature_pose_001"
          ],
          "confidence": 0.9
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
        "fact_card_ui_attack_001",
        "fact_card_ui_hp_001",
        "fact_card_ui_illustrator_001",
        "fact_card_ui_name_001",
        "fact_card_ui_set_code_001",
        "fact_card_ui_type_001"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "hp_text_observation_ids": [
        "obs_card_ui_hp_001"
      ],
      "collector_number_observation_ids": [
        "obs_card_ui_set_code_001"
      ],
      "set_symbol_observation_ids": [],
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
      "other_print_marker_observation_ids": [
        "obs_card_ui_attacks_001"
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
        "dark forest background",
        "floating tendrils",
        "purple glowing eye"
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
        "obs_creature_pose_001"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [],
        "eyebrows": [],
        "facial_features": [],
        "body_language": [
          "floating"
        ],
        "body_position": [],
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
          "dark forest",
          "twisted branches"
        ],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.8,
      "uncertainty": "none"
    }
  ],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "dark forest background",
      "supporting_observation_ids": [
        "obs_environment_001"
      ]
    },
    {
      "term": "floating tendrils",
      "supporting_observation_ids": [
        "obs_creature_pose_001"
      ]
    },
    {
      "term": "purple glowing eye",
      "supporting_observation_ids": [
        "obs_creature_eye_001"
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
        "confidence": 0.8
      },
      {
        "concept": "floating",
        "source_observation_ids": [
          "obs_creature_pose_001",
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
        "confidence": 0.92
      },
      {
        "concept": "frontal orientation",
        "source_observation_ids": [
          "obs_creature_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "glowing highlights",
        "source_observation_ids": [
          "obs_creature_eye_001",
          "obs_creature_face_001",
          "obs_creature_head_001",
          "obs_objects_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "right orientation",
        "source_observation_ids": [
          "obs_creature_eye_001",
          "obs_creature_face_001",
          "obs_creature_head_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "spreading limbs",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "spreading tendrils",
        "source_observation_ids": [
          "obs_creature_pose_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.9
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-097 - Mega Chandelure ex

- Branch: `pokemon`
- Review status: `needs_review`
- Description confidence: `0.99`
- Attribute confidence: `0.98`
- Cost USD: `0.008772`
- Artwork observations: `10`
- Card UI / print-marker observations: `8`
- Card UI module evidence references: `6`
- Derived digest: Fact digest. Scene subjects: Mega Chandelure. Visible observations: mega chandelure, glass body purple glow, black chandelier arms golden flame tips, yellow glowing highlights chandelier arms, three flame tipped arms upward, two lower curved arms flame tips, black top body golden outlines, face area simple eyes glowing interior. Semantic facts: floating.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Chandelure Pokemon | mega chandelure | scene_subject | foreground | high | 0.99 |
| central spherical glass body with light purple glow | glass body purple glow | creature_anatomy | foreground | high | 0.98 |
| black chandelier arms spiraling out with golden flame tips | black chandelier arms golden flame tips | creature_anatomy | foreground | high | 0.98 |
| yellow glowing highlights on chandelier arms | yellow glowing highlights chandelier arms | creature_anatomy | foreground | medium | 0.95 |
| three main flame-tipped arms extending upward | three flame tipped arms upward | creature_anatomy | foreground | high | 0.96 |
| two lower curved arms with flame tips | two lower curved arms flame tips | creature_anatomy | foreground | high | 0.96 |
| black main top body with golden outline details | black top body golden outlines | creature_anatomy | foreground | high | 0.95 |
| face area with simple eye markings and glowing interior | face area simple eyes glowing interior | creature_anatomy | foreground | high | 0.96 |
| swirling blue and purple flame-like background | blue purple flame background | environment | background | medium | 0.95 |
| dark purple energy symbol top right | dark purple energy symbol | objects_and_props | card_ui_layer | medium | 0.98 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text 'メガシャンデラ ex' in yellow and white on purple background | card_ui_text | top center | fully_visible | 0.99 |
| HP 350 top right in white and purple | card_ui_text | top right | fully_visible | 0.99 |
| weakness symbol: white circle with blue cross (water) x2 bottom center-left | card_ui_symbol | bottom center-left | fully_visible | 0.99 |
| resistance symbol: fist with -30 bottom center | card_ui_symbol | bottom center | fully_visible | 0.99 |
| retreat cost two colorless symbols bottom center-right | card_ui_symbol | bottom center-right | fully_visible | 0.99 |
| illustrator text '5ban Graphics' bottom left | illustrator_text | bottom left | fully_visible | 0.98 |
| card number '097/081 SR' bottom left | collector_number | bottom left | fully_visible | 0.98 |
| set symbol 'J M5' bottom left | set_symbol | bottom left | fully_visible | 0.98 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | subject identity | obs_subject_001 | 0.99 |
| fact_creature_anatomy_001 | creature_anatomy | body region description | obs_creature_anatomy_001 | 0.98 |
| fact_creature_anatomy_002 | creature_anatomy | body region description | obs_creature_anatomy_002, obs_creature_anatomy_003, obs_creature_anatomy_004, obs_creature_anatomy_005 | 0.98 |
| fact_creature_anatomy_003 | creature_anatomy | body region description | obs_creature_anatomy_007 | 0.96 |
| fact_environment_001 | environment | background description | obs_environment_001 | 0.95 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_and_print_markers_name_001 | card name text | obs_card_ui_name_001 | 0.99 |
| fact_card_ui_and_print_markers_hp_001 | hp text | obs_card_ui_hp_001 | 0.99 |
| fact_card_ui_and_print_markers_weakness_001 | weakness symbol | obs_card_ui_weakness_001 | 0.99 |
| fact_card_ui_and_print_markers_resistance_001 | resistance symbol | obs_card_ui_resistance_001 | 0.99 |
| fact_card_ui_and_print_markers_retreat_001 | retreat cost | obs_card_ui_retreat_001 | 0.99 |
| fact_card_ui_and_print_markers_illustrator_001 | illustrator text | obs_card_ui_illustrator_001 | 0.98 |
| fact_card_ui_and_print_markers_number_001 | collector number | obs_card_ui_number_001 | 0.98 |
| fact_card_ui_and_print_markers_set_symbol_001 | set symbol | obs_card_ui_set_symbol_001 | 0.98 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_and_print_markers_hp_001",
    "fact_card_ui_and_print_markers_illustrator_001",
    "fact_card_ui_and_print_markers_name_001",
    "fact_card_ui_and_print_markers_number_001",
    "fact_card_ui_and_print_markers_resistance_001",
    "fact_card_ui_and_print_markers_retreat_001",
    "fact_card_ui_and_print_markers_set_symbol_001",
    "fact_card_ui_and_print_markers_weakness_001"
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
    "obs_card_ui_set_symbol_001"
  ],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [],
  "bottom_line_text_observation_ids": [],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [
    "obs_objects_001"
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
| environment | complete | none | high |  |
| composition | none_visible | none | not_applicable |  |
| color_and_light | likely_complete | low | high |  |
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
| sem_fact_001 | state | floating | obs_subject_001 | obs_subject_001 | floating upright floating | 0.99 |

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
| purple glowing body | obs_creature_anatomy_001 |
| black golden chandelier arms | obs_creature_anatomy_002, obs_creature_anatomy_003, obs_creature_anatomy_004, obs_creature_anatomy_005 |
| flame tips | obs_creature_anatomy_002, obs_creature_anatomy_004, obs_creature_anatomy_005 |
| floating pose | obs_subject_001 |
| blue purple flame background | obs_environment_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| flame | obs_creature_anatomy_002, obs_creature_anatomy_004, obs_creature_anatomy_005, obs_environment_001 | deterministic_rule | 0.98 |
| floating | obs_subject_001 | deterministic_rule | 0.99 |
| forward orientation | obs_subject_001 | deterministic_rule | 0.99 |
| glowing highlights | obs_creature_anatomy_001, obs_creature_anatomy_003, obs_creature_anatomy_007 | deterministic_rule | 0.98 |
| upright | obs_subject_001 | deterministic_rule | 0.99 |
| upward orientation | obs_creature_anatomy_004 | deterministic_rule | 0.96 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Chandelure. Visible observations: mega chandelure, glass body purple glow, black chandelier arms golden flame tips, yellow glowing highlights chandelier arms, three flame tipped arms upward, two lower curved arms flame tips, black top body golden outlines, face area simple eyes glowing interior. Semantic facts: floating.
- Quality flags: `potential_count_reference_inconsistent`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "Mega Chandelure Pokemon",
      "normalized_label": "mega chandelure",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_001",
      "kind": "creature_anatomy",
      "label": "central spherical glass body with light purple glow",
      "normalized_label": "glass body purple glow",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_002",
      "kind": "creature_anatomy",
      "label": "black chandelier arms spiraling out with golden flame tips",
      "normalized_label": "black chandelier arms golden flame tips",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_003",
      "kind": "creature_anatomy",
      "label": "yellow glowing highlights on chandelier arms",
      "normalized_label": "yellow glowing highlights chandelier arms",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_004",
      "kind": "creature_anatomy",
      "label": "three main flame-tipped arms extending upward",
      "normalized_label": "three flame tipped arms upward",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_005",
      "kind": "creature_anatomy",
      "label": "two lower curved arms with flame tips",
      "normalized_label": "two lower curved arms flame tips",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_006",
      "kind": "creature_anatomy",
      "label": "black main top body with golden outline details",
      "normalized_label": "black top body golden outlines",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_007",
      "kind": "creature_anatomy",
      "label": "face area with simple eye markings and glowing interior",
      "normalized_label": "face area simple eyes glowing interior",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "swirling blue and purple flame-like background",
      "normalized_label": "blue purple flame background",
      "scene_layer": "background",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_objects_001",
      "kind": "objects_and_props",
      "label": "dark purple energy symbol top right",
      "normalized_label": "dark purple energy symbol",
      "scene_layer": "card_ui_layer",
      "frame_position": "top right",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_001",
      "kind": "card_ui_text",
      "label": "card name text 'メガシャンデラ ex' in yellow and white on purple background",
      "normalized_label": "card name text mega chandelure ex",
      "scene_layer": "card_ui_layer",
      "frame_position": "top center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_hp_001",
      "kind": "card_ui_text",
      "label": "HP 350 top right in white and purple",
      "normalized_label": "hp 350",
      "scene_layer": "card_ui_layer",
      "frame_position": "top right",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_weakness_001",
      "kind": "card_ui_symbol",
      "label": "weakness symbol: white circle with blue cross (water) x2 bottom center-left",
      "normalized_label": "weakness water x2",
      "scene_layer": "card_ui_layer",
      "frame_position": "bottom center-left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_resistance_001",
      "kind": "card_ui_symbol",
      "label": "resistance symbol: fist with -30 bottom center",
      "normalized_label": "resistance fist -30",
      "scene_layer": "card_ui_layer",
      "frame_position": "bottom center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_retreat_001",
      "kind": "card_ui_symbol",
      "label": "retreat cost two colorless symbols bottom center-right",
      "normalized_label": "retreat cost two colorless",
      "scene_layer": "card_ui_layer",
      "frame_position": "bottom center-right",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_illustrator_001",
      "kind": "illustrator_text",
      "label": "illustrator text '5ban Graphics' bottom left",
      "normalized_label": "illustrator 5ban graphics",
      "scene_layer": "card_ui_layer",
      "frame_position": "bottom left",
      "visibility": "fully_visible",
      "salience": "low",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_number_001",
      "kind": "collector_number",
      "label": "card number '097/081 SR' bottom left",
      "normalized_label": "card number 097/081 sr",
      "scene_layer": "card_ui_layer",
      "frame_position": "bottom left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_symbol_001",
      "kind": "set_symbol",
      "label": "set symbol 'J M5' bottom left",
      "normalized_label": "set symbol j m5",
      "scene_layer": "card_ui_layer",
      "frame_position": "bottom left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_001",
      "module": "subjects",
      "field_path": "[0]",
      "claim": "subject identity",
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
      "claim": "body region description",
      "value": "large spherical glass body with purple glow",
      "supporting_observation_ids": [
        "obs_creature_anatomy_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_002",
      "module": "creature_anatomy",
      "field_path": "body_regions.chandelier_arms",
      "claim": "body region description",
      "value": "black chandelier arms with golden flame tips",
      "supporting_observation_ids": [
        "obs_creature_anatomy_002",
        "obs_creature_anatomy_003",
        "obs_creature_anatomy_004",
        "obs_creature_anatomy_005"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_003",
      "module": "creature_anatomy",
      "field_path": "body_regions.face_area",
      "claim": "body region description",
      "value": "face area with eye markings and glowing interior",
      "supporting_observation_ids": [
        "obs_creature_anatomy_007"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "setting.background",
      "claim": "background description",
      "value": "swirling blue and purple flame-like background",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_name_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text",
      "value": "メガシャンデラ ex",
      "supporting_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_hp_001",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text",
      "claim": "hp text",
      "value": "350",
      "supporting_observation_ids": [
        "obs_card_ui_hp_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_weakness_001",
      "module": "card_ui_and_print_markers",
      "field_path": "weakness_symbol",
      "claim": "weakness symbol",
      "value": "water x2",
      "supporting_observation_ids": [
        "obs_card_ui_weakness_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_resistance_001",
      "module": "card_ui_and_print_markers",
      "field_path": "resistance_symbol",
      "claim": "resistance symbol",
      "value": "fist -30",
      "supporting_observation_ids": [
        "obs_card_ui_resistance_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_retreat_001",
      "module": "card_ui_and_print_markers",
      "field_path": "retreat_cost",
      "claim": "retreat cost",
      "value": "two colorless",
      "supporting_observation_ids": [
        "obs_card_ui_retreat_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_illustrator_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator text",
      "value": "5ban Graphics",
      "supporting_observation_ids": [
        "obs_card_ui_illustrator_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_number_001",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "collector number",
      "value": "097/081 SR",
      "supporting_observation_ids": [
        "obs_card_ui_number_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_set_symbol_001",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "set symbol",
      "value": "J M5",
      "supporting_observation_ids": [
        "obs_card_ui_set_symbol_001"
      ],
      "confidence": 0.98,
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
        "black chandelier arms spiraling out with golden flame tips",
        "central spherical glass body with purple glow",
        "face area with simple eye markings and glowing interior",
        "yellow glowing highlights on chandelier arms"
      ],
      "physical_features": [
        "glowing flames on arm tips"
      ],
      "pose": [
        "floating",
        "upright"
      ],
      "orientation": "forward",
      "action_state": [
        "none"
      ],
      "facial_evidence": {
        "eyes": "glowing eye markings",
        "mouth": "not visible",
        "eyebrows": "not visible",
        "face_position": "center",
        "other_visible_evidence": [
          "glowing interior face area"
        ]
      },
      "clothing_or_accessories": [],
      "colors": [
        "black",
        "gold",
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
      "obs_environment_001"
    ]
  },
  "environment": {
    "setting": [
      "flame-like blue and purple swirling background"
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
      "label": "dark purple energy symbol",
      "normalized_label": "energy symbol",
      "object_type": "symbol",
      "colors": [
        "dark purple"
      ],
      "material_appearance": [],
      "location": "top right",
      "count_reference": "count_001",
      "confidence": 0.98
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "blue",
      "gold",
      "purple",
      "yellow"
    ],
    "lighting": [
      "glowing highlights",
      "soft glow"
    ],
    "shadows": [
      "soft shadows on body"
    ],
    "highlights": [
      "golden flame tips",
      "yellow highlights on body"
    ],
    "composition": [
      "diagonal arm extensions",
      "subject centered"
    ],
    "camera_angle": "slightly tilted front",
    "framing": "tight frame",
    "cropping": [
      "fully visible subject"
    ],
    "depth": "moderate depth with layered arms",
    "motion_cues": [
      "floating appearance"
    ],
    "motifs": [
      "chandelier",
      "flame"
    ],
    "repeated_shapes": [
      "flames",
      "spiral arms"
    ],
    "style_cues": [
      "glowing effects",
      "high contrast"
    ],
    "supporting_observation_ids": [
      "obs_creature_anatomy_001",
      "obs_creature_anatomy_002",
      "obs_creature_anatomy_004",
      "obs_creature_anatomy_005",
      "obs_environment_001"
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
        "fact_creature_anatomy_003"
      ],
      "body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "central body",
          "feature": "spherical glass body",
          "visibility": "fully_visible",
          "colors": [
            "purple"
          ],
          "details": [
            "glassy appearance",
            "light purple glow"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_001"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "arms",
          "feature": "chandelier arms",
          "visibility": "fully_visible",
          "colors": [
            "black",
            "gold",
            "yellow"
          ],
          "details": [
            "five arms",
            "flame tips",
            "spiral shaped"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_002",
            "obs_creature_anatomy_003",
            "obs_creature_anatomy_004",
            "obs_creature_anatomy_005"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "face",
          "feature": "eye markings and glowing interior",
          "visibility": "fully_visible",
          "colors": [
            "black",
            "purple"
          ],
          "details": [
            "glowing face area",
            "simple eye markings"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_007"
          ],
          "confidence": 0.96
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
          "orientation": "forward",
          "action_state": [
            "none"
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
        "obs_creature_anatomy_001",
        "obs_creature_anatomy_003",
        "obs_environment_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": []
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_ui_and_print_markers_hp_001",
        "fact_card_ui_and_print_markers_illustrator_001",
        "fact_card_ui_and_print_markers_name_001",
        "fact_card_ui_and_print_markers_number_001",
        "fact_card_ui_and_print_markers_resistance_001",
        "fact_card_ui_and_print_markers_retreat_001",
        "fact_card_ui_and_print_markers_set_symbol_001",
        "fact_card_ui_and_print_markers_weakness_001"
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
        "obs_card_ui_set_symbol_001"
      ],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [],
      "bottom_line_text_observation_ids": [],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [
        "obs_objects_001"
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
        "purple glowing body",
        "black golden chandelier arms",
        "flame tips",
        "floating pose",
        "blue purple flame background"
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
      "category": "state",
      "label": "floating",
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
          "floating"
        ],
        "body_position": [
          "upright"
        ],
        "motion_state": [
          "floating"
        ],
        "environment": [],
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
      "term": "purple glowing body",
      "supporting_observation_ids": [
        "obs_creature_anatomy_001"
      ]
    },
    {
      "term": "black golden chandelier arms",
      "supporting_observation_ids": [
        "obs_creature_anatomy_002",
        "obs_creature_anatomy_003",
        "obs_creature_anatomy_004",
        "obs_creature_anatomy_005"
      ]
    },
    {
      "term": "flame tips",
      "supporting_observation_ids": [
        "obs_creature_anatomy_002",
        "obs_creature_anatomy_004",
        "obs_creature_anatomy_005"
      ]
    },
    {
      "term": "floating pose",
      "supporting_observation_ids": [
        "obs_subject_001"
      ]
    },
    {
      "term": "blue purple flame background",
      "supporting_observation_ids": [
        "obs_environment_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "flame",
        "source_observation_ids": [
          "obs_creature_anatomy_002",
          "obs_creature_anatomy_004",
          "obs_creature_anatomy_005",
          "obs_environment_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
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
          "obs_creature_anatomy_001",
          "obs_creature_anatomy_003",
          "obs_creature_anatomy_007"
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
      },
      {
        "concept": "upward orientation",
        "source_observation_ids": [
          "obs_creature_anatomy_004"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.96
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
- Cost USD: `0.0095048`
- Artwork observations: `18`
- Card UI / print-marker observations: `0`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. Scene subjects: female human character. Visible observations: brick stone wall background with yellow lighting, arched doorways with illuminated lamps, stone tiled floor. Semantic facts: standing.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| female human character | female human character | scene_subject | foreground | prominent | 0.99 |
| medium-length straight purple hair | medium-length straight purple hair | human_hair | foreground | prominent | 0.98 |
| side swept bangs | side swept bangs | human_hair | foreground | prominent | 0.95 |
| neutral or slightly unhappy mouth expression | neutral or slightly unhappy mouth expression | human_facial_expression | foreground | prominent | 0.9 |
| purple eyes | purple eyes | human_eye | foreground | prominent | 0.98 |
| thin purple eyebrows | thin purple eyebrows | human_eyebrows | foreground | prominent | 0.95 |
| front-facing, slightly looking right | front-facing slightly looking right | human_face | foreground | prominent | 0.95 |
| white cape with yellow star symbol on right sleeve | white cape with yellow star symbol on right sleeve | clothing | foreground | prominent | 0.98 |
| black dress | black dress | clothing | foreground | prominent | 0.98 |
| blue gloves | blue gloves | clothing_accessory | foreground | prominent | 0.96 |
| blue belt with gold buckle | blue belt with gold buckle | clothing_accessory | foreground | prominent | 0.97 |
| black ribbon necktie | black ribbon necktie | clothing_accessory | foreground | prominent | 0.95 |
| white rounded hat with black spiral pattern and blue diamond jewel detail | white rounded hat with black spiral pattern and blue diamond jewel detail | clothing_accessory | foreground | prominent | 0.98 |
| standing, upright | standing upright | pose | foreground | prominent | 0.98 |
| right hand raised to shoulder | right hand raised to shoulder | pose | foreground | prominent | 0.9 |
| brick stone wall background with yellow lighting | brick stone wall background with yellow lighting | environment | background | medium | 0.95 |
| arched doorways with illuminated lamps | arched doorways with illuminated lamps | environment | background | medium | 0.9 |
| stone tiled floor | stone tiled floor | environment | background | medium | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| none recorded | | | | |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | scene subject identity | obs_subject_001 | 0.99 |
| fact_hair_001 | human_appearance | hair description | obs_hair_001, obs_hair_002 | 0.95 |
| fact_face_001 | human_appearance | mouth expression | obs_facial_expression_001 | 0.9 |
| fact_face_002 | human_appearance | eye color | obs_eyes_001 | 0.98 |
| fact_face_003 | human_appearance | eyebrow color and type | obs_eyebrows_001 | 0.95 |
| fact_face_004 | human_appearance | face position | obs_face_position_001 | 0.95 |
| fact_clothing_001 | clothing | garment type | obs_outfit_001 | 0.98 |
| fact_clothing_002 | clothing | garment type | obs_outfit_002 | 0.98 |
| fact_clothing_003 | clothing | accessory type | obs_outfit_003 | 0.96 |
| fact_clothing_004 | clothing | accessory type | obs_outfit_004 | 0.97 |
| fact_clothing_005 | clothing | accessory type | obs_accessories_001 | 0.95 |
| fact_clothing_006 | clothing | headgear type | obs_headgear_001 | 0.98 |
| fact_pose_001 | creature_anatomy | pose | obs_pose_001 | 0.98 |
| fact_pose_002 | creature_anatomy | pose | obs_pose_002 | 0.9 |
| fact_environment_001 | environment | background | obs_background_001, obs_background_002 | 0.95 |
| fact_environment_002 | environment | ground | obs_background_003 | 0.95 |

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
| objects_and_props | none_visible | none | not_applicable |  |
| environment | complete | none | high |  |
| composition | none_visible | none | not_applicable |  |
| color_and_light | none_visible | none | not_applicable |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | none_visible | none | not_applicable |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | partial_due_to_low_resolution | low | medium |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| svf_001 | state | standing | obs_subject_001 | obs_pose_001 | neutral or slightly unhappy mouth visible purple eyes thin purple purple hair right hand raised to shoulder standing upright | 0.95 |

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
| purple hair | obs_hair_001, obs_hair_002 |
| white cape | obs_outfit_001 |
| black dress | obs_outfit_002 |
| blue gloves | obs_outfit_003 |
| blue belt | obs_outfit_004 |
| arched brick wall background | obs_background_001, obs_background_002 |
| yellow lighting | obs_background_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| cape | obs_outfit_001 | deterministic_rule | 0.98 |
| circular motif | obs_headgear_001 | deterministic_rule | 0.98 |
| forward-right orientation | obs_face_position_001 | deterministic_rule | 0.95 |
| gloves | obs_outfit_003 | deterministic_rule | 0.96 |
| hat | obs_headgear_001 | deterministic_rule | 0.98 |
| right hand raised to shoulder | obs_pose_002, obs_subject_001 | deterministic_rule | 0.99 |
| right orientation | obs_outfit_001, obs_pose_001, obs_pose_002, obs_subject_001 | deterministic_rule | 0.99 |
| spiral motif | obs_headgear_001 | deterministic_rule | 0.98 |
| standing | obs_pose_001, obs_subject_001 | deterministic_rule | 0.99 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: female human character. Visible observations: brick stone wall background with yellow lighting, arched doorways with illuminated lamps, stone tiled floor. Semantic facts: standing.
- Quality flags: `potential_module_incomplete_or_low_evidence`, `potential_unavailable_metadata_prompt_branch_mismatch`
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
      "salience": "prominent",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hair_001",
      "kind": "human_hair",
      "label": "medium-length straight purple hair",
      "normalized_label": "medium-length straight purple hair",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hair_002",
      "kind": "human_hair",
      "label": "side swept bangs",
      "normalized_label": "side swept bangs",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_facial_expression_001",
      "kind": "human_facial_expression",
      "label": "neutral or slightly unhappy mouth expression",
      "normalized_label": "neutral or slightly unhappy mouth expression",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_eyes_001",
      "kind": "human_eye",
      "label": "purple eyes",
      "normalized_label": "purple eyes",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_eyebrows_001",
      "kind": "human_eyebrows",
      "label": "thin purple eyebrows",
      "normalized_label": "thin purple eyebrows",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_face_position_001",
      "kind": "human_face",
      "label": "front-facing, slightly looking right",
      "normalized_label": "front-facing slightly looking right",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_outfit_001",
      "kind": "clothing",
      "label": "white cape with yellow star symbol on right sleeve",
      "normalized_label": "white cape with yellow star symbol on right sleeve",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_outfit_002",
      "kind": "clothing",
      "label": "black dress",
      "normalized_label": "black dress",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_outfit_003",
      "kind": "clothing_accessory",
      "label": "blue gloves",
      "normalized_label": "blue gloves",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_outfit_004",
      "kind": "clothing_accessory",
      "label": "blue belt with gold buckle",
      "normalized_label": "blue belt with gold buckle",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_accessories_001",
      "kind": "clothing_accessory",
      "label": "black ribbon necktie",
      "normalized_label": "black ribbon necktie",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_headgear_001",
      "kind": "clothing_accessory",
      "label": "white rounded hat with black spiral pattern and blue diamond jewel detail",
      "normalized_label": "white rounded hat with black spiral pattern and blue diamond jewel detail",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_001",
      "kind": "pose",
      "label": "standing, upright",
      "normalized_label": "standing upright",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_002",
      "kind": "pose",
      "label": "right hand raised to shoulder",
      "normalized_label": "right hand raised to shoulder",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_background_001",
      "kind": "environment",
      "label": "brick stone wall background with yellow lighting",
      "normalized_label": "brick stone wall background with yellow lighting",
      "scene_layer": "background",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_background_002",
      "kind": "environment",
      "label": "arched doorways with illuminated lamps",
      "normalized_label": "arched doorways with illuminated lamps",
      "scene_layer": "background",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_background_003",
      "kind": "environment",
      "label": "stone tiled floor",
      "normalized_label": "stone tiled floor",
      "scene_layer": "background",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_001",
      "module": "subjects",
      "field_path": "subjects[0].identity",
      "claim": "scene subject identity",
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
      "field_path": "hair[0].label",
      "claim": "hair description",
      "value": "medium-length straight purple hair with side swept bangs",
      "supporting_observation_ids": [
        "obs_hair_001",
        "obs_hair_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_face_001",
      "module": "human_appearance",
      "field_path": "facial_evidence.mouth",
      "claim": "mouth expression",
      "value": "neutral or slightly unhappy mouth",
      "supporting_observation_ids": [
        "obs_facial_expression_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_face_002",
      "module": "human_appearance",
      "field_path": "facial_evidence.eyes",
      "claim": "eye color",
      "value": "purple",
      "supporting_observation_ids": [
        "obs_eyes_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_face_003",
      "module": "human_appearance",
      "field_path": "facial_evidence.eyebrows",
      "claim": "eyebrow color and type",
      "value": "thin purple eyebrows",
      "supporting_observation_ids": [
        "obs_eyebrows_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_face_004",
      "module": "human_appearance",
      "field_path": "facial_evidence.face_position",
      "claim": "face position",
      "value": "front-facing slightly looking right",
      "supporting_observation_ids": [
        "obs_face_position_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_001",
      "module": "clothing",
      "field_path": "garments[0]",
      "claim": "garment type",
      "value": "white cape with yellow star symbol on right sleeve",
      "supporting_observation_ids": [
        "obs_outfit_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_002",
      "module": "clothing",
      "field_path": "garments[1]",
      "claim": "garment type",
      "value": "black dress",
      "supporting_observation_ids": [
        "obs_outfit_002"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_003",
      "module": "clothing",
      "field_path": "accessories[0]",
      "claim": "accessory type",
      "value": "blue gloves",
      "supporting_observation_ids": [
        "obs_outfit_003"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_004",
      "module": "clothing",
      "field_path": "accessories[1]",
      "claim": "accessory type",
      "value": "blue belt with gold buckle",
      "supporting_observation_ids": [
        "obs_outfit_004"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_005",
      "module": "clothing",
      "field_path": "accessories[2]",
      "claim": "accessory type",
      "value": "black ribbon necktie",
      "supporting_observation_ids": [
        "obs_accessories_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_006",
      "module": "clothing",
      "field_path": "accessories[3]",
      "claim": "headgear type",
      "value": "white rounded hat with black spiral pattern and blue diamond jewel detail",
      "supporting_observation_ids": [
        "obs_headgear_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_pose_001",
      "module": "creature_anatomy",
      "field_path": "pose_orientation[0].pose",
      "claim": "pose",
      "value": "standing upright",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_pose_002",
      "module": "creature_anatomy",
      "field_path": "pose_orientation[1].pose",
      "claim": "pose",
      "value": "right hand raised to shoulder",
      "supporting_observation_ids": [
        "obs_pose_002"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "setting[0]",
      "claim": "background",
      "value": "brick stone wall with yellow lighting and arched doorways",
      "supporting_observation_ids": [
        "obs_background_001",
        "obs_background_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_002",
      "module": "environment",
      "field_path": "ground[0]",
      "claim": "ground",
      "value": "stone tiled floor",
      "supporting_observation_ids": [
        "obs_background_003"
      ],
      "confidence": 0.95,
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
        "hands",
        "head",
        "torso"
      ],
      "physical_features": [
        "purple eyes",
        "purple hair",
        "thin purple eyebrows"
      ],
      "pose": [
        "right hand raised to shoulder",
        "standing"
      ],
      "orientation": "right",
      "action_state": [],
      "facial_evidence": {
        "eyes": "visible purple eyes",
        "mouth": "neutral or slightly unhappy",
        "eyebrows": "thin purple",
        "face_position": "front-facing slightly looking right",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [
        "black dress",
        "black ribbon necktie",
        "blue belt with gold buckle",
        "blue gloves",
        "white cape with yellow star symbol on right sleeve",
        "white rounded hat with black spiral pattern and blue diamond jewel detail"
      ],
      "colors": [
        "black",
        "blue",
        "purple",
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
      "obs_accessories_001",
      "obs_eyebrows_001",
      "obs_eyes_001",
      "obs_hair_001",
      "obs_hair_002",
      "obs_headgear_001",
      "obs_outfit_001",
      "obs_outfit_002",
      "obs_outfit_003",
      "obs_outfit_004",
      "obs_pose_001",
      "obs_pose_002",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_background_001",
      "obs_background_002",
      "obs_background_003"
    ]
  },
  "environment": {
    "setting": [
      "arched doorways",
      "brick stone wall with yellow lighting"
    ],
    "indoor_outdoor": "indoor",
    "sky": [],
    "ground": [
      "stone tiled floor"
    ],
    "terrain": [
      "stone floor"
    ],
    "plants": [],
    "architecture": [
      "arched doorways",
      "brick wall"
    ],
    "water": [],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_background_001",
      "obs_background_002",
      "obs_background_003"
    ]
  },
  "objects_and_props": [],
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
      "warm yellow indoor lighting"
    ],
    "shadows": [
      "soft shadows on character and background"
    ],
    "highlights": [
      "shine on hair and fabric edges"
    ],
    "composition": [
      "centered subject",
      "frontal pose"
    ],
    "camera_angle": "eye-level",
    "framing": "medium shot",
    "cropping": [
      "full subject visible"
    ],
    "depth": "visible foreground and background",
    "motion_cues": [],
    "motifs": [
      "spiral pattern on hat"
    ],
    "repeated_shapes": [
      "arched doorways"
    ],
    "style_cues": [
      "clean line art"
    ],
    "supporting_observation_ids": [
      "obs_background_001",
      "obs_headgear_001",
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
        "fact_face_002",
        "fact_face_003",
        "fact_face_004",
        "fact_hair_001"
      ],
      "visible_body_regions": [],
      "facial_evidence": [],
      "hair": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "medium-length straight purple hair with side swept bangs",
          "details": [],
          "supporting_observation_ids": [
            "obs_hair_001",
            "obs_hair_002"
          ],
          "confidence": 0.95
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
            "standing"
          ],
          "orientation": "right",
          "action_state": [],
          "supporting_observation_ids": [
            "obs_pose_001"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "right hand raised to shoulder"
          ],
          "orientation": "right",
          "action_state": [],
          "supporting_observation_ids": [
            "obs_pose_002"
          ],
          "confidence": 0.9
        }
      ],
      "effects": []
    },
    "clothing": {
      "fact_ids": [
        "fact_clothing_001",
        "fact_clothing_002",
        "fact_clothing_003",
        "fact_clothing_004",
        "fact_clothing_005",
        "fact_clothing_006"
      ],
      "garments": [
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "torso and arms",
          "garment": "white cape with yellow star symbol on right sleeve",
          "neckline_type": "",
          "sleeve_type": "",
          "colors": [
            "white",
            "yellow"
          ],
          "visible_details": [
            "yellow star symbol on right sleeve"
          ],
          "supporting_observation_ids": [
            "obs_outfit_001"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "torso",
          "garment": "black dress",
          "neckline_type": "",
          "sleeve_type": "",
          "colors": [
            "black"
          ],
          "visible_details": [],
          "supporting_observation_ids": [
            "obs_outfit_002"
          ],
          "confidence": 0.98
        }
      ],
      "accessories": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "blue gloves",
          "details": [],
          "supporting_observation_ids": [
            "obs_outfit_003"
          ],
          "confidence": 0.96
        },
        {
          "subject_observation_id": "obs_subject_001",
          "label": "blue belt with gold buckle",
          "details": [],
          "supporting_observation_ids": [
            "obs_outfit_004"
          ],
          "confidence": 0.97
        },
        {
          "subject_observation_id": "obs_subject_001",
          "label": "black ribbon necktie",
          "details": [],
          "supporting_observation_ids": [
            "obs_accessories_001"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_001",
          "label": "white rounded hat with black spiral pattern and blue diamond jewel detail",
          "details": [
            "black spiral pattern",
            "blue diamond jewel detail"
          ],
          "supporting_observation_ids": [
            "obs_headgear_001"
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
        "fact_environment_001",
        "fact_environment_002"
      ],
      "observation_ids": [
        "obs_background_001",
        "obs_background_002",
        "obs_background_003"
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
        "purple hair",
        "white cape",
        "black dress",
        "blue gloves",
        "blue belt",
        "arched brick wall background",
        "yellow lighting"
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
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
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
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "svf_001",
      "category": "state",
      "label": "standing",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "evidence": {
        "mouth": [
          "neutral or slightly unhappy mouth"
        ],
        "eyes": [
          "visible purple eyes"
        ],
        "eyebrows": [
          "thin purple"
        ],
        "facial_features": [
          "purple hair"
        ],
        "body_language": [
          "right hand raised to shoulder"
        ],
        "body_position": [
          "standing upright"
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
      "term": "purple hair",
      "supporting_observation_ids": [
        "obs_hair_001",
        "obs_hair_002"
      ]
    },
    {
      "term": "white cape",
      "supporting_observation_ids": [
        "obs_outfit_001"
      ]
    },
    {
      "term": "black dress",
      "supporting_observation_ids": [
        "obs_outfit_002"
      ]
    },
    {
      "term": "blue gloves",
      "supporting_observation_ids": [
        "obs_outfit_003"
      ]
    },
    {
      "term": "blue belt",
      "supporting_observation_ids": [
        "obs_outfit_004"
      ]
    },
    {
      "term": "arched brick wall background",
      "supporting_observation_ids": [
        "obs_background_001",
        "obs_background_002"
      ]
    },
    {
      "term": "yellow lighting",
      "supporting_observation_ids": [
        "obs_background_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "cape",
        "source_observation_ids": [
          "obs_outfit_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "circular motif",
        "source_observation_ids": [
          "obs_headgear_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "forward-right orientation",
        "source_observation_ids": [
          "obs_face_position_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "gloves",
        "source_observation_ids": [
          "obs_outfit_003"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.96
      },
      {
        "concept": "hat",
        "source_observation_ids": [
          "obs_headgear_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "right hand raised to shoulder",
        "source_observation_ids": [
          "obs_pose_002",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "right orientation",
        "source_observation_ids": [
          "obs_outfit_001",
          "obs_pose_001",
          "obs_pose_002",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "spiral motif",
        "source_observation_ids": [
          "obs_headgear_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "standing",
        "source_observation_ids": [
          "obs_pose_001",
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
- Review status: `pending`
- Description confidence: `0.98`
- Attribute confidence: `0.96`
- Cost USD: `0.010124`
- Artwork observations: `9`
- Card UI / print-marker observations: `4`
- Card UI module evidence references: `4`
- Derived digest: Fact digest. Scene subjects: human male character. Visible observations: human male character, short blond hair, black jacket with spikes, black gloves, brown pouch, pose standing side profile with raised hand, stormy dark sky, mountainous terrain. Semantic facts: standing, stormy dark sky.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| human male character | human male character | scene_subject | foreground | high | 0.99 |
| short blond hair with a distinctive sharp fringe | short blond hair | hair | foreground | high | 0.98 |
| black high collar jacket with red lining and spikes on the shoulders | black jacket with spikes | clothing | foreground | high | 0.97 |
| black gloves | black gloves | clothing | foreground | medium | 0.95 |
| brown belt pouch on left hip | brown pouch | clothing | foreground | medium | 0.96 |
| character facing left with head slightly turned and right hand raised in claw-like gesture above shoulder | pose standing side profile with raised hand | pose | foreground | high | 0.96 |
| stormy dark sky with clouds and lightning effects | stormy dark sky | environment | background | high | 0.95 |
| mountainous terrain visible in lower background | mountainous terrain | environment | background | medium | 0.9 |
| purple and blue color palette with glowing streaks of light | purple and blue glowing streaks | environment | background | high | 0.94 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text グラジオの決戦 | card_ui_text | top left | visible | 0.98 |
| set code J M5 116/081 SAR | card_ui_text | bottom left | visible | 0.97 |
| ©2026 Pokémon/Nintendo/Creatures/GAME FREAK | copyright_text | bottom | visible | 0.96 |
| トレーナーズ (Trainers) サポート (Supporter) | card_ui_text | top | visible | 0.95 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | presence of main human character | obs_subject_001 | 0.99 |
| fact_hair_001 | human_appearance | hair style and color | obs_hair_001 | 0.98 |
| fact_clothing_001 | clothing | upper body clothing | obs_clothing_001 | 0.97 |
| fact_clothing_002 | clothing | hand clothing | obs_clothing_002 | 0.95 |
| fact_clothing_003 | clothing | waist accessory | obs_clothing_003 | 0.96 |
| fact_pose_001 | creature_anatomy | character pose | obs_pose_001 | 0.96 |
| fact_environment_001 | environment | stormy dark sky with lightning and clouds | obs_environment_001 | 0.95 |
| fact_environment_002 | environment | mountainous terrain in background | obs_environment_002 | 0.9 |
| fact_environment_003 | color_and_light | color palette | obs_environment_003 | 0.94 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_001 | card name text in Japanese | obs_card_ui_name_001 | 0.98 |
| fact_card_ui_002 | card set code and number | obs_card_ui_set_code_001 | 0.97 |
| fact_card_ui_003 | copyright text visible | obs_card_ui_copyright_001 | 0.96 |
| fact_card_ui_004 | card subtype text | obs_card_ui_subtype_001 | 0.95 |

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
    "obs_card_ui_name_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_card_ui_set_code_001"
  ],
  "set_symbol_observation_ids": [],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [
    "obs_card_ui_copyright_001"
  ],
  "bottom_line_text_observation_ids": [
    "obs_card_ui_subtype_001"
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
| creature_anatomy | complete | none | high |  |
| clothing | complete | none | high |  |
| objects_and_props | none_visible | none | not_applicable |  |
| environment | complete | none | high |  |
| composition | complete | none | high |  |
| color_and_light | complete | none | high |  |
| visual_effects | complete | none | high |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | not_applicable | none | not_applicable |  |
| fact_grounded_search_terms | complete | low | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| sem_fact_pose_001 | action | standing | obs_subject_001 | obs_pose_001 | raised right hand in claw-like gesture standing | 0.96 |
| sem_fact_env_001 | environment | stormy dark sky |  | obs_environment_001 | clouds lightning stormy dark sky | 0.95 |

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
| stormy sky | obs_environment_001 |
| lightning | obs_environment_001 |
| mountainous terrain | obs_environment_002 |
| blond hair | obs_hair_001 |
| black jacket with spikes | obs_clothing_001 |
| raised hand gesture | obs_pose_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| centered composition | obs_pose_001 | deterministic_rule | 0.92 |
| facing left side | obs_pose_001, obs_subject_001 | deterministic_rule | 0.99 |
| gloves | obs_clothing_002 | deterministic_rule | 0.95 |
| glowing highlights | obs_environment_003 | deterministic_rule | 0.94 |
| head slightly turned | obs_pose_001 | deterministic_rule | 0.96 |
| left orientation | obs_pose_001, obs_subject_001 | deterministic_rule | 0.99 |
| right hand raised | obs_pose_001 | deterministic_rule | 0.96 |
| right hand raised above shoulder in claw-like gesture | obs_subject_001 | deterministic_rule | 0.99 |
| sky | obs_environment_001 | deterministic_rule | 0.95 |
| standing | obs_pose_001 | deterministic_rule | 0.96 |
| stormy dark sky | obs_environment_001 | deterministic_rule | 0.95 |
| terrain | obs_environment_002 | deterministic_rule | 0.9 |
| upward orientation | obs_pose_001 | deterministic_rule | 0.92 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: human male character. Visible observations: human male character, short blond hair, black jacket with spikes, black gloves, brown pouch, pose standing side profile with raised hand, stormy dark sky, mountainous terrain. Semantic facts: standing, stormy dark sky.
- Quality flags: `none`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "human male character",
      "normalized_label": "human male character",
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
      "label": "short blond hair with a distinctive sharp fringe",
      "normalized_label": "short blond hair",
      "scene_layer": "foreground",
      "frame_position": "head",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_001",
      "kind": "clothing",
      "label": "black high collar jacket with red lining and spikes on the shoulders",
      "normalized_label": "black jacket with spikes",
      "scene_layer": "foreground",
      "frame_position": "upper body",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_002",
      "kind": "clothing",
      "label": "black gloves",
      "normalized_label": "black gloves",
      "scene_layer": "foreground",
      "frame_position": "hands",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_003",
      "kind": "clothing",
      "label": "brown belt pouch on left hip",
      "normalized_label": "brown pouch",
      "scene_layer": "foreground",
      "frame_position": "waist",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_001",
      "kind": "pose",
      "label": "character facing left with head slightly turned and right hand raised in claw-like gesture above shoulder",
      "normalized_label": "pose standing side profile with raised hand",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "stormy dark sky with clouds and lightning effects",
      "normalized_label": "stormy dark sky",
      "scene_layer": "background",
      "frame_position": "full background",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_002",
      "kind": "environment",
      "label": "mountainous terrain visible in lower background",
      "normalized_label": "mountainous terrain",
      "scene_layer": "background",
      "frame_position": "bottom",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_003",
      "kind": "environment",
      "label": "purple and blue color palette with glowing streaks of light",
      "normalized_label": "purple and blue glowing streaks",
      "scene_layer": "background",
      "frame_position": "full image",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_001",
      "kind": "card_ui_text",
      "label": "card name text グラジオの決戦",
      "normalized_label": "Gladion's Final Battle card name",
      "scene_layer": "card_ui",
      "frame_position": "top left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_code_001",
      "kind": "card_ui_text",
      "label": "set code J M5 116/081 SAR",
      "normalized_label": "set code and number",
      "scene_layer": "card_ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_copyright_001",
      "kind": "copyright_text",
      "label": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "normalized_label": "copyright line",
      "scene_layer": "card_ui",
      "frame_position": "bottom",
      "visibility": "visible",
      "salience": "low",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_subtype_001",
      "kind": "card_ui_text",
      "label": "トレーナーズ (Trainers) サポート (Supporter)",
      "normalized_label": "Trainer Supporter subtype text",
      "scene_layer": "card_ui",
      "frame_position": "top",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_001",
      "module": "subjects",
      "field_path": "scene_subject[0].identity",
      "claim": "presence of main human character",
      "value": "human male character",
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
      "claim": "hair style and color",
      "value": "short blond hair with sharp fringe",
      "supporting_observation_ids": [
        "obs_hair_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_001",
      "module": "clothing",
      "field_path": "garments[0].label",
      "claim": "upper body clothing",
      "value": "black high collar jacket with red lining and shoulder spikes",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_002",
      "module": "clothing",
      "field_path": "accessories[0].label",
      "claim": "hand clothing",
      "value": "black gloves",
      "supporting_observation_ids": [
        "obs_clothing_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_003",
      "module": "clothing",
      "field_path": "accessories[1].label",
      "claim": "waist accessory",
      "value": "brown belt pouch on left hip",
      "supporting_observation_ids": [
        "obs_clothing_003"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_pose_001",
      "module": "creature_anatomy",
      "field_path": "pose_orientation[0].pose",
      "claim": "character pose",
      "value": "facing left side with head slightly turned and right hand raised",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "setting[0]",
      "claim": "stormy dark sky with lightning and clouds",
      "value": "stormy dark sky",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_002",
      "module": "environment",
      "field_path": "terrain[0]",
      "claim": "mountainous terrain in background",
      "value": "mountainous terrain",
      "supporting_observation_ids": [
        "obs_environment_002"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_003",
      "module": "color_and_light",
      "field_path": "palette[0]",
      "claim": "color palette",
      "value": "purple and blue glowing streaks",
      "supporting_observation_ids": [
        "obs_environment_003"
      ],
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text in Japanese",
      "value": "グラジオの決戦",
      "supporting_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_002",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "card set code and number",
      "value": "J M5 116/081 SAR",
      "supporting_observation_ids": [
        "obs_card_ui_set_code_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_003",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line",
      "claim": "copyright text visible",
      "value": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "supporting_observation_ids": [
        "obs_card_ui_copyright_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_004",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text",
      "claim": "card subtype text",
      "value": "トレーナーズ (Trainers) サポート (Supporter)",
      "supporting_observation_ids": [
        "obs_card_ui_subtype_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "human male character",
      "identity_confidence": 0.99,
      "anatomy": [
        "arms",
        "hands",
        "head",
        "neck",
        "shoulders",
        "torso"
      ],
      "physical_features": [
        "short blond hair with sharp fringe"
      ],
      "pose": [
        "facing left side",
        "right hand raised above shoulder in claw-like gesture"
      ],
      "orientation": "left",
      "action_state": [
        "standing"
      ],
      "facial_evidence": {
        "eyes": "visible and looking forward",
        "mouth": "neutral",
        "eyebrows": "visible",
        "face_position": "side profile",
        "other_visible_evidence": [
          "sharp blond bangs"
        ]
      },
      "clothing_or_accessories": [
        "black gloves",
        "black high collar jacket with spikes",
        "brown belt pouch"
      ],
      "colors": [
        "black",
        "blond",
        "brown",
        "red lining"
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
      "stormy dark sky"
    ],
    "indoor_outdoor": "outdoor",
    "sky": [
      "clouds",
      "lightning"
    ],
    "ground": [
      "mountainous terrain"
    ],
    "terrain": [
      "mountainous"
    ],
    "plants": [],
    "architecture": [],
    "water": [],
    "weather": [
      "stormy"
    ],
    "time_of_day_cues": [
      "daytime with sun obscured by clouds"
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
      "purple",
      "red",
      "yellow"
    ],
    "lighting": [
      "bright highlight from lightning",
      "diffuse ambient light from sky"
    ],
    "shadows": [
      "shadowing on character jacket and face"
    ],
    "highlights": [
      "light streaks crossing image"
    ],
    "composition": [
      "character central, facing left",
      "stormy background fills frame"
    ],
    "camera_angle": "medium close-up, side profile",
    "framing": "centered on character torso and head",
    "cropping": [
      "full figure vertically centered"
    ],
    "depth": "deep with layered background and foreground character",
    "motion_cues": [
      "dynamic gesture pose",
      "light streaks crossing diagonally"
    ],
    "motifs": [
      "spiky shoulder jacket",
      "storm and lightning motif"
    ],
    "repeated_shapes": [],
    "style_cues": [
      "bright and high contrast"
    ],
    "supporting_observation_ids": [
      "obs_environment_001",
      "obs_environment_003",
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
      "fact_ids": [
        "fact_hair_001",
        "fact_pose_001"
      ],
      "visible_body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "visibility": "visible",
          "details": [
            "short blond hair with sharp fringe"
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
          "face_position": "side profile",
          "eyes": "visible and looking forward",
          "mouth": "neutral",
          "eyebrows": "visible",
          "other_visible_evidence": [
            "sharp blond bangs"
          ],
          "supporting_observation_ids": [
            "obs_subject_001"
          ],
          "confidence": 0.96
        }
      ],
      "hair": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "short blond hair",
          "details": [
            "sharp fringe"
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
          "label": "raised right hand in claw-like gesture",
          "details": [
            "hand near head"
          ],
          "supporting_observation_ids": [
            "obs_pose_001"
          ],
          "confidence": 0.96
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
            "facing left side",
            "head slightly turned",
            "right hand raised"
          ],
          "orientation": "left",
          "action_state": [
            "standing"
          ],
          "supporting_observation_ids": [
            "obs_pose_001"
          ],
          "confidence": 0.96
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
          "garment": "black high collar jacket with red lining and shoulder spikes",
          "neckline_type": "high collar",
          "sleeve_type": "long sleeves",
          "colors": [
            "black",
            "red"
          ],
          "visible_details": [
            "shoulder spikes"
          ],
          "supporting_observation_ids": [
            "obs_clothing_001"
          ],
          "confidence": 0.97
        }
      ],
      "accessories": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "black gloves",
          "details": [],
          "supporting_observation_ids": [
            "obs_clothing_002"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_001",
          "label": "brown belt pouch on left hip",
          "details": [],
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
        "fact_environment_001",
        "fact_environment_002"
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
        "obs_pose_001",
        "obs_subject_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [
        "fact_environment_003"
      ],
      "observation_ids": [
        "obs_environment_003"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": [
        "obs_environment_001",
        "obs_environment_003"
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
        "obs_card_ui_name_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_card_ui_set_code_001"
      ],
      "set_symbol_observation_ids": [],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [
        "obs_card_ui_copyright_001"
      ],
      "bottom_line_text_observation_ids": [
        "obs_card_ui_subtype_001"
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
        "stormy sky",
        "lightning",
        "mountainous terrain",
        "blond hair",
        "black jacket with spikes",
        "raised hand gesture"
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
      "semantic_fact_id": "sem_fact_pose_001",
      "category": "action",
      "label": "standing",
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
          "raised right hand in claw-like gesture"
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
      "confidence": 0.96,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "sem_fact_env_001",
      "category": "environment",
      "label": "stormy dark sky",
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
          "clouds",
          "lightning",
          "stormy dark sky"
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
      "term": "stormy sky",
      "supporting_observation_ids": [
        "obs_environment_001"
      ]
    },
    {
      "term": "lightning",
      "supporting_observation_ids": [
        "obs_environment_001"
      ]
    },
    {
      "term": "mountainous terrain",
      "supporting_observation_ids": [
        "obs_environment_002"
      ]
    },
    {
      "term": "blond hair",
      "supporting_observation_ids": [
        "obs_hair_001"
      ]
    },
    {
      "term": "black jacket with spikes",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ]
    },
    {
      "term": "raised hand gesture",
      "supporting_observation_ids": [
        "obs_pose_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "centered composition",
        "source_observation_ids": [
          "obs_pose_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "facing left side",
        "source_observation_ids": [
          "obs_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "gloves",
        "source_observation_ids": [
          "obs_clothing_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "glowing highlights",
        "source_observation_ids": [
          "obs_environment_003"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.94
      },
      {
        "concept": "head slightly turned",
        "source_observation_ids": [
          "obs_pose_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.96
      },
      {
        "concept": "left orientation",
        "source_observation_ids": [
          "obs_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "right hand raised",
        "source_observation_ids": [
          "obs_pose_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.96
      },
      {
        "concept": "right hand raised above shoulder in claw-like gesture",
        "source_observation_ids": [
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
        "confidence": 0.95
      },
      {
        "concept": "standing",
        "source_observation_ids": [
          "obs_pose_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.96
      },
      {
        "concept": "stormy dark sky",
        "source_observation_ids": [
          "obs_environment_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "terrain",
        "source_observation_ids": [
          "obs_environment_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.9
      },
      {
        "concept": "upward orientation",
        "source_observation_ids": [
          "obs_pose_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-110 - Rust Syndicate Grunt

- Branch: `trainer`
- Review status: `needs_review`
- Description confidence: `0.98`
- Attribute confidence: `0.95`
- Cost USD: `0.0119516`
- Artwork observations: `16`
- Card UI / print-marker observations: `0`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. Scene subjects: female trainer, male trainer. Visible observations: female human trainer, male human trainer, suit jacket, tie, collared shirt, sunglasses, blonde hair, right hand with purple nails. Semantic facts: female trainer standing with hand on hip, male trainer standing back to back with female trainer.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| female human trainer | female human trainer | scene_subject | foreground | high | 0.99 |
| male human trainer | male human trainer | scene_subject | foreground | high | 0.99 |
| dark suit jacket with patch | suit jacket | object | foreground | medium | 0.95 |
| tie with blue and white stripes | tie | object | foreground | medium | 0.95 |
| white collared shirt | collared shirt | object | foreground | medium | 0.95 |
| purple sunglasses | sunglasses | object | foreground | medium | 0.95 |
| female trainer blonde hair, styled back | blonde hair | object | foreground | high | 0.99 |
| female right hand with purple-painted nails on hip | right hand with purple nails | object | foreground | medium | 0.95 |
| male trainer dark brown hair, high flat top | dark brown hair | object | foreground | high | 0.99 |
| male trainer white collared shirt | collared shirt | object | foreground | medium | 0.95 |
| male trainer striped tie, purple and white | tie | object | foreground | medium | 0.95 |
| male trainer dark jacket | jacket | object | foreground | medium | 0.95 |
| male trainer with small round glasses | small round glasses | object | foreground | medium | 0.95 |
| female trainer with hand on hip, standing front facing left | standing pose with hand on hip | object | foreground | high | 0.98 |
| male trainer standing back to back with female trainer, facing right | standing pose back to back | object | foreground | high | 0.98 |
| large green leaves or plant near bottom left | plant leaves | object | background | medium | 0.9 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| none recorded | | | | |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | subjects | female trainer present | obs_subject_001 | 0.99 |
| fact_002 | subjects | male trainer present | obs_subject_002 | 0.99 |
| fact_003 | human_appearance | female trainer hair color | obs_hair_001 | 0.99 |
| fact_004 | human_appearance | male trainer hair color | obs_hair_002 | 0.99 |
| fact_005 | clothing | female trainer wears dark suit jacket with patch | obs_clothing_001 | 0.95 |
| fact_006 | clothing | female trainer wears white collared shirt | obs_clothing_003 | 0.95 |
| fact_007 | clothing | female trainer wears blue and white striped tie | obs_clothing_002 | 0.95 |
| fact_008 | clothing | male trainer wears dark jacket | obs_clothing_006 | 0.95 |
| fact_009 | clothing | male trainer wears white collared shirt | obs_clothing_004 | 0.95 |
| fact_010 | clothing | male trainer wears purple and white striped tie | obs_clothing_005 | 0.95 |
| fact_011 | human_appearance | female trainer wears purple sunglasses | obs_accessories_001 | 0.95 |
| fact_012 | human_appearance | male trainer wears small round glasses | obs_facial_001 | 0.95 |
| fact_013 | human_appearance | female trainer right hand visible on hip with purple nails | obs_hand_001 | 0.95 |
| fact_014 | human_appearance | female trainer standing with hand on hip | obs_pose_001 | 0.98 |
| fact_015 | human_appearance | male trainer standing back to back with female trainer | obs_pose_002 | 0.98 |
| fact_016 | environment | green leaves near bottom left | obs_environment_001 | 0.9 |

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
| objects_and_props | none_visible | none | not_applicable |  |
| environment | partial_due_to_crop | medium | medium |  |
| composition | complete | none | high |  |
| color_and_light | complete | none | high |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | partial_due_to_crop | medium | medium |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | not_applicable | none | not_applicable |  |
| fact_grounded_search_terms | complete | none | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| sem_001 | state | female trainer standing with hand on hip | obs_subject_001 | obs_hand_001, obs_pose_001 | closed smile covered by sunglasses visible purple sunglasses hand on hip standing purple sunglasses | 0.98 |
| sem_002 | state | male trainer standing back to back with female trainer | obs_subject_002 | obs_pose_002 | neutral closed covered by glasses neutral small round glasses standing standing back to back small round glasses | 0.98 |

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
| dark suit jacket | obs_clothing_001 |
| striped tie | obs_clothing_002, obs_clothing_005 |
| purple sunglasses | obs_accessories_001 |
| small round glasses | obs_facial_001 |
| blonde hair | obs_hair_001 |
| high flat top hair | obs_hair_002 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| circular motif | obs_facial_001 | deterministic_rule | 0.95 |
| female trainer standing with hand on hip | obs_hand_001, obs_pose_001 | deterministic_rule | 0.98 |
| hand on hip | obs_subject_001 | deterministic_rule | 0.99 |
| left orientation | obs_environment_001, obs_subject_001 | deterministic_rule | 0.99 |
| male trainer standing back to back with female trainer | obs_pose_002 | deterministic_rule | 0.98 |
| right orientation | obs_hand_001, obs_subject_002 | deterministic_rule | 0.99 |
| standing | obs_pose_001, obs_pose_002, obs_subject_001, obs_subject_002 | deterministic_rule | 0.99 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: female trainer, male trainer. Visible observations: female human trainer, male human trainer, suit jacket, tie, collared shirt, sunglasses, blonde hair, right hand with purple nails. Semantic facts: female trainer standing with hand on hip, male trainer standing back to back with female trainer.
- Quality flags: `potential_module_incomplete_or_low_evidence`, `potential_pose_or_action_without_visible_support`
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
      "frame_position": "left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_subject_002",
      "kind": "scene_subject",
      "label": "male human trainer",
      "normalized_label": "male human trainer",
      "scene_layer": "foreground",
      "frame_position": "right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_001",
      "kind": "object",
      "label": "dark suit jacket with patch",
      "normalized_label": "suit jacket",
      "scene_layer": "foreground",
      "frame_position": "female trainer torso",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_002",
      "kind": "object",
      "label": "tie with blue and white stripes",
      "normalized_label": "tie",
      "scene_layer": "foreground",
      "frame_position": "female trainer chest",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_003",
      "kind": "object",
      "label": "white collared shirt",
      "normalized_label": "collared shirt",
      "scene_layer": "foreground",
      "frame_position": "female trainer neck",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_accessories_001",
      "kind": "object",
      "label": "purple sunglasses",
      "normalized_label": "sunglasses",
      "scene_layer": "foreground",
      "frame_position": "female trainer face",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hair_001",
      "kind": "object",
      "label": "female trainer blonde hair, styled back",
      "normalized_label": "blonde hair",
      "scene_layer": "foreground",
      "frame_position": "female trainer head",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hand_001",
      "kind": "object",
      "label": "female right hand with purple-painted nails on hip",
      "normalized_label": "right hand with purple nails",
      "scene_layer": "foreground",
      "frame_position": "female trainer hip",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hair_002",
      "kind": "object",
      "label": "male trainer dark brown hair, high flat top",
      "normalized_label": "dark brown hair",
      "scene_layer": "foreground",
      "frame_position": "male trainer head",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_004",
      "kind": "object",
      "label": "male trainer white collared shirt",
      "normalized_label": "collared shirt",
      "scene_layer": "foreground",
      "frame_position": "male trainer neck",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_005",
      "kind": "object",
      "label": "male trainer striped tie, purple and white",
      "normalized_label": "tie",
      "scene_layer": "foreground",
      "frame_position": "male trainer chest",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_006",
      "kind": "object",
      "label": "male trainer dark jacket",
      "normalized_label": "jacket",
      "scene_layer": "foreground",
      "frame_position": "male trainer torso",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_facial_001",
      "kind": "object",
      "label": "male trainer with small round glasses",
      "normalized_label": "small round glasses",
      "scene_layer": "foreground",
      "frame_position": "male trainer face",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_001",
      "kind": "object",
      "label": "female trainer with hand on hip, standing front facing left",
      "normalized_label": "standing pose with hand on hip",
      "scene_layer": "foreground",
      "frame_position": "female trainer full body left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_002",
      "kind": "object",
      "label": "male trainer standing back to back with female trainer, facing right",
      "normalized_label": "standing pose back to back",
      "scene_layer": "foreground",
      "frame_position": "male trainer full body right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "object",
      "label": "large green leaves or plant near bottom left",
      "normalized_label": "plant leaves",
      "scene_layer": "background",
      "frame_position": "bottom left",
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
      "field_path": "subjects[0]",
      "claim": "female trainer present",
      "value": "true",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_002",
      "module": "subjects",
      "field_path": "subjects[1]",
      "claim": "male trainer present",
      "value": "true",
      "supporting_observation_ids": [
        "obs_subject_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_003",
      "module": "human_appearance",
      "field_path": "hair[0]",
      "claim": "female trainer hair color",
      "value": "blonde",
      "supporting_observation_ids": [
        "obs_hair_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "human_appearance",
      "field_path": "hair[1]",
      "claim": "male trainer hair color",
      "value": "dark brown",
      "supporting_observation_ids": [
        "obs_hair_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_005",
      "module": "clothing",
      "field_path": "garments[0]",
      "claim": "female trainer wears dark suit jacket with patch",
      "value": "true",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_006",
      "module": "clothing",
      "field_path": "garments[1]",
      "claim": "female trainer wears white collared shirt",
      "value": "true",
      "supporting_observation_ids": [
        "obs_clothing_003"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_007",
      "module": "clothing",
      "field_path": "garments[2]",
      "claim": "female trainer wears blue and white striped tie",
      "value": "true",
      "supporting_observation_ids": [
        "obs_clothing_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_008",
      "module": "clothing",
      "field_path": "garments[3]",
      "claim": "male trainer wears dark jacket",
      "value": "true",
      "supporting_observation_ids": [
        "obs_clothing_006"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_009",
      "module": "clothing",
      "field_path": "garments[4]",
      "claim": "male trainer wears white collared shirt",
      "value": "true",
      "supporting_observation_ids": [
        "obs_clothing_004"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_010",
      "module": "clothing",
      "field_path": "garments[5]",
      "claim": "male trainer wears purple and white striped tie",
      "value": "true",
      "supporting_observation_ids": [
        "obs_clothing_005"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_011",
      "module": "human_appearance",
      "field_path": "accessories[0]",
      "claim": "female trainer wears purple sunglasses",
      "value": "true",
      "supporting_observation_ids": [
        "obs_accessories_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_012",
      "module": "human_appearance",
      "field_path": "accessories[1]",
      "claim": "male trainer wears small round glasses",
      "value": "true",
      "supporting_observation_ids": [
        "obs_facial_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_013",
      "module": "human_appearance",
      "field_path": "visible_body_regions[0]",
      "claim": "female trainer right hand visible on hip with purple nails",
      "value": "true",
      "supporting_observation_ids": [
        "obs_hand_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_014",
      "module": "human_appearance",
      "field_path": "pose[0]",
      "claim": "female trainer standing with hand on hip",
      "value": "true",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_015",
      "module": "human_appearance",
      "field_path": "pose[1]",
      "claim": "male trainer standing back to back with female trainer",
      "value": "true",
      "supporting_observation_ids": [
        "obs_pose_002"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_016",
      "module": "environment",
      "field_path": "plants[0]",
      "claim": "green leaves near bottom left",
      "value": "true",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "female trainer",
      "identity_confidence": 0.99,
      "anatomy": [
        "head",
        "left arm",
        "left hand",
        "neck",
        "right arm",
        "right hand",
        "torso"
      ],
      "physical_features": [
        "blonde hair"
      ],
      "pose": [
        "hand on hip",
        "standing"
      ],
      "orientation": "left",
      "action_state": [],
      "facial_evidence": {
        "eyes": "covered by sunglasses",
        "mouth": "closed smile",
        "eyebrows": "visible",
        "face_position": "front",
        "other_visible_evidence": [
          "purple sunglasses"
        ]
      },
      "clothing_or_accessories": [
        "blue and white striped tie",
        "dark suit jacket with patch",
        "purple sunglasses",
        "white collared shirt"
      ],
      "colors": [
        "blue tie",
        "dark jacket",
        "purple nails",
        "white shirt"
      ],
      "visibility": "visible"
    },
    {
      "observation_id": "obs_subject_002",
      "subject_kind": "scene_subject",
      "identity": "male trainer",
      "identity_confidence": 0.99,
      "anatomy": [
        "arms",
        "head",
        "neck",
        "torso"
      ],
      "physical_features": [
        "dark brown hair",
        "high flat top hairstyle"
      ],
      "pose": [
        "standing"
      ],
      "orientation": "right",
      "action_state": [],
      "facial_evidence": {
        "eyes": "covered by small round glasses",
        "mouth": "neutral closed",
        "eyebrows": "neutral",
        "face_position": "profile right",
        "other_visible_evidence": [
          "small round glasses"
        ]
      },
      "clothing_or_accessories": [
        "dark jacket",
        "purple and white striped tie",
        "white collared shirt"
      ],
      "colors": [
        "dark jacket",
        "purple tie",
        "white shirt"
      ],
      "visibility": "visible"
    }
  ],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [],
  "scene_layers": {
    "foreground": [
      "obs_accessories_001",
      "obs_clothing_001",
      "obs_clothing_002",
      "obs_clothing_003",
      "obs_clothing_004",
      "obs_clothing_005",
      "obs_clothing_006",
      "obs_facial_001",
      "obs_hair_001",
      "obs_hair_002",
      "obs_hand_001",
      "obs_pose_001",
      "obs_pose_002",
      "obs_subject_001",
      "obs_subject_002"
    ],
    "midground": [],
    "background": [
      "obs_environment_001"
    ]
  },
  "environment": {
    "setting": [],
    "indoor_outdoor": "uncertain",
    "sky": [],
    "ground": [],
    "terrain": [],
    "plants": [
      "obs environment 001"
    ],
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
      "blue",
      "dark colors",
      "green",
      "purple",
      "white"
    ],
    "lighting": [
      "even lighting",
      "no visible strong shadows"
    ],
    "shadows": [
      "minimal visible shadows"
    ],
    "highlights": [
      "mild highlights on hair"
    ],
    "composition": [
      "plants foreground left",
      "two human trainers back to back center composition"
    ],
    "camera_angle": "frontal parallel",
    "framing": "tight vertical framing",
    "cropping": [
      "tight crop on human trainers"
    ],
    "depth": "shallow depth of field",
    "motion_cues": [],
    "motifs": [
      "business suit theme",
      "stylish glasses"
    ],
    "repeated_shapes": [
      "striped ties"
    ],
    "style_cues": [
      "digital art",
      "stylized"
    ],
    "supporting_observation_ids": [
      "obs_accessories_001",
      "obs_clothing_001",
      "obs_clothing_002",
      "obs_clothing_003",
      "obs_clothing_004",
      "obs_clothing_005",
      "obs_clothing_006",
      "obs_environment_001",
      "obs_facial_001",
      "obs_hair_001",
      "obs_hair_002",
      "obs_subject_001",
      "obs_subject_002"
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
        "fact_001",
        "fact_002"
      ],
      "scene_subject_observation_ids": [
        "obs_subject_001",
        "obs_subject_002"
      ],
      "depicted_subject_observation_ids": [],
      "character_representation_observation_ids": []
    },
    "human_appearance": {
      "fact_ids": [
        "fact_003",
        "fact_004",
        "fact_011",
        "fact_012",
        "fact_013",
        "fact_014",
        "fact_015"
      ],
      "visible_body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "right hand",
          "visibility": "visible",
          "details": [
            "purple nail polish"
          ],
          "supporting_observation_ids": [
            "obs_hand_001"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "hair",
          "visibility": "visible",
          "details": [
            "blonde",
            "stylish"
          ],
          "supporting_observation_ids": [
            "obs_hair_001"
          ],
          "confidence": 0.99
        },
        {
          "subject_observation_id": "obs_subject_002",
          "region": "hair",
          "visibility": "visible",
          "details": [
            "dark brown",
            "high flat top"
          ],
          "supporting_observation_ids": [
            "obs_hair_002"
          ],
          "confidence": 0.99
        }
      ],
      "facial_evidence": [
        {
          "subject_observation_id": "obs_subject_001",
          "face_position": "front",
          "eyes": "covered by sunglasses",
          "mouth": "closed smile",
          "eyebrows": "visible",
          "other_visible_evidence": [
            "purple sunglasses"
          ],
          "supporting_observation_ids": [
            "obs_accessories_001"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_002",
          "face_position": "profile right",
          "eyes": "covered by glasses",
          "mouth": "neutral closed",
          "eyebrows": "neutral",
          "other_visible_evidence": [
            "small round glasses"
          ],
          "supporting_observation_ids": [
            "obs_facial_001"
          ],
          "confidence": 0.95
        }
      ],
      "hair": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "blonde hair",
          "details": [
            "styled back"
          ],
          "supporting_observation_ids": [
            "obs_hair_001"
          ],
          "confidence": 0.99
        },
        {
          "subject_observation_id": "obs_subject_002",
          "label": "dark brown hair",
          "details": [
            "high flat top"
          ],
          "supporting_observation_ids": [
            "obs_hair_002"
          ],
          "confidence": 0.99
        }
      ],
      "gestures": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "hand on hip",
          "details": [
            "right hand on hip",
            "standing pose"
          ],
          "supporting_observation_ids": [
            "obs_hand_001",
            "obs_pose_001"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_002",
          "label": "standing back to back",
          "details": [
            "back to back with female trainer",
            "standing"
          ],
          "supporting_observation_ids": [
            "obs_pose_002"
          ],
          "confidence": 0.98
        }
      ],
      "accessories": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "purple sunglasses",
          "details": [
            "stylish eyewear"
          ],
          "supporting_observation_ids": [
            "obs_accessories_001"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_002",
          "label": "small round glasses",
          "details": [
            "eyewear"
          ],
          "supporting_observation_ids": [
            "obs_facial_001"
          ],
          "confidence": 0.95
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
        "fact_005",
        "fact_006",
        "fact_007",
        "fact_008",
        "fact_009",
        "fact_010"
      ],
      "garments": [
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "torso",
          "garment": "dark suit jacket with patch",
          "neckline_type": "not visible",
          "sleeve_type": "long",
          "colors": [
            "dark"
          ],
          "visible_details": [
            "patch on chest"
          ],
          "supporting_observation_ids": [
            "obs_clothing_001"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "neck/chest",
          "garment": "white collared shirt",
          "neckline_type": "collared",
          "sleeve_type": "not visible",
          "colors": [
            "white"
          ],
          "visible_details": [],
          "supporting_observation_ids": [
            "obs_clothing_003"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "chest",
          "garment": "blue and white striped tie",
          "neckline_type": "not applicable",
          "sleeve_type": "not applicable",
          "colors": [
            "blue",
            "white"
          ],
          "visible_details": [
            "striped pattern"
          ],
          "supporting_observation_ids": [
            "obs_clothing_002"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_002",
          "body_area": "torso",
          "garment": "dark jacket",
          "neckline_type": "not visible",
          "sleeve_type": "long",
          "colors": [
            "dark"
          ],
          "visible_details": [],
          "supporting_observation_ids": [
            "obs_clothing_006"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_002",
          "body_area": "neck/chest",
          "garment": "white collared shirt",
          "neckline_type": "collared",
          "sleeve_type": "not visible",
          "colors": [
            "white"
          ],
          "visible_details": [],
          "supporting_observation_ids": [
            "obs_clothing_004"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_002",
          "body_area": "chest",
          "garment": "purple and white striped tie",
          "neckline_type": "not applicable",
          "sleeve_type": "not applicable",
          "colors": [
            "purple",
            "white"
          ],
          "visible_details": [
            "striped pattern"
          ],
          "supporting_observation_ids": [
            "obs_clothing_005"
          ],
          "confidence": 0.95
        }
      ],
      "accessories": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "purple sunglasses",
          "details": [
            "eyewear"
          ],
          "supporting_observation_ids": [
            "obs_accessories_001"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_002",
          "label": "small round glasses",
          "details": [
            "eyewear"
          ],
          "supporting_observation_ids": [
            "obs_facial_001"
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
        "fact_016"
      ],
      "observation_ids": [
        "obs_environment_001"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_pose_001",
        "obs_pose_002"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_accessories_001",
        "obs_clothing_002",
        "obs_clothing_005",
        "obs_environment_001",
        "obs_facial_001",
        "obs_hair_001",
        "obs_hair_002"
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
        "dark suit jacket",
        "striped tie",
        "purple sunglasses",
        "small round glasses",
        "blonde hair",
        "high flat top hair"
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
      "review_status": "partial_due_to_crop",
      "omission_risk": "medium",
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
      "semantic_fact_id": "sem_001",
      "category": "state",
      "label": "female trainer standing with hand on hip",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_hand_001",
        "obs_pose_001"
      ],
      "evidence": {
        "mouth": [
          "closed smile"
        ],
        "eyes": [
          "covered by sunglasses"
        ],
        "eyebrows": [
          "visible"
        ],
        "facial_features": [
          "purple sunglasses"
        ],
        "body_language": [
          "hand on hip"
        ],
        "body_position": [
          "standing"
        ],
        "motion_state": [],
        "environment": [],
        "objects": [
          "purple sunglasses"
        ],
        "relationships": [],
        "other": []
      },
      "confidence": 0.98,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "sem_002",
      "category": "state",
      "label": "male trainer standing back to back with female trainer",
      "subject_observation_id": "obs_subject_002",
      "supporting_observation_ids": [
        "obs_pose_002"
      ],
      "evidence": {
        "mouth": [
          "neutral closed"
        ],
        "eyes": [
          "covered by glasses"
        ],
        "eyebrows": [
          "neutral"
        ],
        "facial_features": [
          "small round glasses"
        ],
        "body_language": [
          "standing"
        ],
        "body_position": [
          "standing back to back"
        ],
        "motion_state": [],
        "environment": [],
        "objects": [
          "small round glasses"
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
      "term": "dark suit jacket",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ]
    },
    {
      "term": "striped tie",
      "supporting_observation_ids": [
        "obs_clothing_002",
        "obs_clothing_005"
      ]
    },
    {
      "term": "purple sunglasses",
      "supporting_observation_ids": [
        "obs_accessories_001"
      ]
    },
    {
      "term": "small round glasses",
      "supporting_observation_ids": [
        "obs_facial_001"
      ]
    },
    {
      "term": "blonde hair",
      "supporting_observation_ids": [
        "obs_hair_001"
      ]
    },
    {
      "term": "high flat top hair",
      "supporting_observation_ids": [
        "obs_hair_002"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "circular motif",
        "source_observation_ids": [
          "obs_facial_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "female trainer standing with hand on hip",
        "source_observation_ids": [
          "obs_hand_001",
          "obs_pose_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "hand on hip",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "left orientation",
        "source_observation_ids": [
          "obs_environment_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "male trainer standing back to back with female trainer",
        "source_observation_ids": [
          "obs_pose_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "right orientation",
        "source_observation_ids": [
          "obs_hand_001",
          "obs_subject_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "standing",
        "source_observation_ids": [
          "obs_pose_001",
          "obs_pose_002",
          "obs_subject_001",
          "obs_subject_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-S6A-100 - Turffield Stadium

- Branch: `stadium`
- Review status: `needs_review`
- Description confidence: `0.99`
- Attribute confidence: `0.97`
- Cost USD: `0.00898`
- Artwork observations: `13`
- Card UI / print-marker observations: `0`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. Visible observations: stadium structure, green leaf emblem, stadium roof, traffic cones, traffic cones, metal railings, stairs, pond. Counts: traffic cones: 6.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: not_applicable.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Large stadium structure with purple and blue horizontal markings | stadium structure | environment_structure | midground | high | 0.99 |
| Green leaf emblem on stadium structure | green leaf emblem | environment_object | midground | medium | 0.98 |
| Roof made with transparent panels and golden/yellow support beams | stadium roof | environment_structure | background | medium | 0.97 |
| Multiple orange and white traffic cones | traffic cones | object | foreground | medium | 0.96 |
| Exact count of 6 traffic cones | traffic cones | count | foreground | high | 0.98 |
| Black metal railings near stairs and cones | metal railings | environment_object | foreground | medium | 0.95 |
| Stone or concrete stairs adjacent to railings and cones | stairs | environment_object | foreground | medium | 0.95 |
| A small water pond or lake to right side of the stadium | pond | environment_object | background | medium | 0.95 |
| Group of dark green coniferous trees on the right background | trees | environment_plants | background | medium | 0.97 |
| Green grassy terrain surrounding stadium | grass terrain | environment_terrain | midground | medium | 0.97 |
| Light blue sky with clouds | sky with clouds | environment_sky | background | medium | 0.98 |
| White and light gray clouds in sky | clouds | environment_clouds | background | medium | 0.98 |
| Paved pathway around stadium | paved pathway | environment_terrain | foreground | medium | 0.96 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| none recorded | | | | |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_env_001 | environment | The card depicts a stadium environment | obs_stadium_roof_001, obs_stadium_structure_001 | 0.99 |
| fact_env_002 | environment | Stadium roof made of transparent panels and yellow support beams | obs_stadium_roof_001 | 0.97 |
| fact_env_003 | environment | Presence of multiple orange and white traffic cones | obs_cones_001, obs_cones_count_001 | 0.98 |
| fact_env_004 | environment | Group of coniferous trees visible on right side of stadium | obs_trees_001 | 0.97 |
| fact_env_005 | environment | Green grassy terrain surrounding the stadium | obs_grass_001 | 0.97 |
| fact_env_006 | environment | Small water pond or lake visible on the right | obs_pond_001 | 0.95 |
| fact_env_007 | environment | Light blue sky with clouds is visible | obs_clouds_001, obs_sky_001 | 0.98 |
| fact_env_008 | environment | Black metal railings near stairs and traffic cones | obs_railings_001 | 0.95 |
| fact_env_009 | environment | Stone or concrete stairs adjacent to railings and cones | obs_stairs_001 | 0.95 |
| fact_env_010 | environment | Visible paved pathway near stadium on right side | obs_pathway_001 | 0.96 |

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
| composition | likely_complete | low | high |  |
| color_and_light | likely_complete | low | high |  |
| visual_effects | not_applicable | none | not_applicable |  |
| card_ui_and_print_markers | partial_due_to_low_resolution | medium | medium | name_text_observation_ids: Name text partially blurred in image |
| counts | complete | none | high |  |
| relationships | not_applicable | none | not_applicable |  |
| surface_and_scan_cues | not_applicable | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | none_visible | none | not_applicable |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| none recorded | | | | | | |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| traffic cones | exact | 6 | obs_cones_001 | 0.98 |

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
| green leaf emblem | obs_green_leaf_emblem_001 |
| stadium roof | obs_stadium_roof_001 |
| traffic cones | obs_cones_001 |
| metal railings | obs_railings_001 |
| stairs | obs_stairs_001 |
| pond | obs_pond_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| building | obs_stadium_roof_001, obs_stadium_structure_001 | deterministic_rule | 0.99 |
| cloud | obs_clouds_001, obs_sky_001 | deterministic_rule | 0.98 |
| sky | obs_sky_001 | deterministic_rule | 0.98 |
| terrain | obs_grass_001, obs_pathway_001 | deterministic_rule | 0.97 |
| tree | obs_trees_001 | deterministic_rule | 0.97 |
| water | obs_pond_001 | deterministic_rule | 0.95 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: stadium structure, green leaf emblem, stadium roof, traffic cones, traffic cones, metal railings, stairs, pond. Counts: traffic cones: 6.
- Quality flags: `potential_module_incomplete_or_low_evidence`, `potential_module_review_conflicts_with_entries`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_stadium_structure_001",
      "kind": "environment_structure",
      "label": "Large stadium structure with purple and blue horizontal markings",
      "normalized_label": "stadium structure",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_green_leaf_emblem_001",
      "kind": "environment_object",
      "label": "Green leaf emblem on stadium structure",
      "normalized_label": "green leaf emblem",
      "scene_layer": "midground",
      "frame_position": "center_right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_stadium_roof_001",
      "kind": "environment_structure",
      "label": "Roof made with transparent panels and golden/yellow support beams",
      "normalized_label": "stadium roof",
      "scene_layer": "background",
      "frame_position": "top_center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_cones_001",
      "kind": "object",
      "label": "Multiple orange and white traffic cones",
      "normalized_label": "traffic cones",
      "scene_layer": "foreground",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_cones_count_001",
      "kind": "count",
      "label": "Exact count of 6 traffic cones",
      "normalized_label": "traffic cones",
      "scene_layer": "foreground",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_railings_001",
      "kind": "environment_object",
      "label": "Black metal railings near stairs and cones",
      "normalized_label": "metal railings",
      "scene_layer": "foreground",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_stairs_001",
      "kind": "environment_object",
      "label": "Stone or concrete stairs adjacent to railings and cones",
      "normalized_label": "stairs",
      "scene_layer": "foreground",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pond_001",
      "kind": "environment_object",
      "label": "A small water pond or lake to right side of the stadium",
      "normalized_label": "pond",
      "scene_layer": "background",
      "frame_position": "right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_trees_001",
      "kind": "environment_plants",
      "label": "Group of dark green coniferous trees on the right background",
      "normalized_label": "trees",
      "scene_layer": "background",
      "frame_position": "right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_grass_001",
      "kind": "environment_terrain",
      "label": "Green grassy terrain surrounding stadium",
      "normalized_label": "grass terrain",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_sky_001",
      "kind": "environment_sky",
      "label": "Light blue sky with clouds",
      "normalized_label": "sky with clouds",
      "scene_layer": "background",
      "frame_position": "top",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clouds_001",
      "kind": "environment_clouds",
      "label": "White and light gray clouds in sky",
      "normalized_label": "clouds",
      "scene_layer": "background",
      "frame_position": "top",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pathway_001",
      "kind": "environment_terrain",
      "label": "Paved pathway around stadium",
      "normalized_label": "paved pathway",
      "scene_layer": "foreground",
      "frame_position": "bottom_right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_env_001",
      "module": "environment",
      "field_path": "setting",
      "claim": "The card depicts a stadium environment",
      "value": "stadium environment",
      "supporting_observation_ids": [
        "obs_stadium_roof_001",
        "obs_stadium_structure_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_002",
      "module": "environment",
      "field_path": "architecture",
      "claim": "Stadium roof made of transparent panels and yellow support beams",
      "value": "transparent roof with yellow beams",
      "supporting_observation_ids": [
        "obs_stadium_roof_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_003",
      "module": "environment",
      "field_path": "objects_and_props",
      "claim": "Presence of multiple orange and white traffic cones",
      "value": "traffic cones, count 6",
      "supporting_observation_ids": [
        "obs_cones_001",
        "obs_cones_count_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_004",
      "module": "environment",
      "field_path": "plants",
      "claim": "Group of coniferous trees visible on right side of stadium",
      "value": "coniferous trees",
      "supporting_observation_ids": [
        "obs_trees_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_005",
      "module": "environment",
      "field_path": "terrain",
      "claim": "Green grassy terrain surrounding the stadium",
      "value": "green grass terrain",
      "supporting_observation_ids": [
        "obs_grass_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_006",
      "module": "environment",
      "field_path": "water",
      "claim": "Small water pond or lake visible on the right",
      "value": "water pond",
      "supporting_observation_ids": [
        "obs_pond_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_007",
      "module": "environment",
      "field_path": "sky",
      "claim": "Light blue sky with clouds is visible",
      "value": "blue sky with clouds",
      "supporting_observation_ids": [
        "obs_clouds_001",
        "obs_sky_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_008",
      "module": "environment",
      "field_path": "objects_and_props",
      "claim": "Black metal railings near stairs and traffic cones",
      "value": "metal railings",
      "supporting_observation_ids": [
        "obs_railings_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_009",
      "module": "environment",
      "field_path": "objects_and_props",
      "claim": "Stone or concrete stairs adjacent to railings and cones",
      "value": "stone stairs",
      "supporting_observation_ids": [
        "obs_stairs_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_010",
      "module": "environment",
      "field_path": "terrain",
      "claim": "Visible paved pathway near stadium on right side",
      "value": "paved pathway",
      "supporting_observation_ids": [
        "obs_pathway_001"
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
      "normalized_label": "traffic cones",
      "count_type": "exact",
      "exact_count": 6,
      "estimated_min": 6,
      "estimated_max": 6,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_cones_001"
      ],
      "scene_layer": "foreground",
      "confidence": 0.98
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_cones_001",
      "obs_cones_count_001",
      "obs_pathway_001",
      "obs_railings_001",
      "obs_stairs_001"
    ],
    "midground": [
      "obs_grass_001",
      "obs_green_leaf_emblem_001",
      "obs_stadium_structure_001"
    ],
    "background": [
      "obs_clouds_001",
      "obs_pond_001",
      "obs_sky_001",
      "obs_stadium_roof_001",
      "obs_trees_001"
    ]
  },
  "environment": {
    "setting": [
      "stadium environment"
    ],
    "indoor_outdoor": "outdoor",
    "sky": [
      "clouds",
      "light blue"
    ],
    "ground": [
      "grass",
      "paved pathway"
    ],
    "terrain": [
      "grass",
      "paved pathway"
    ],
    "plants": [
      "trees"
    ],
    "architecture": [
      "stadium roof",
      "stadium structure"
    ],
    "water": [
      "pond"
    ],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_clouds_001",
      "obs_cones_001",
      "obs_grass_001",
      "obs_pathway_001",
      "obs_pond_001",
      "obs_railings_001",
      "obs_sky_001",
      "obs_stadium_roof_001",
      "obs_stadium_structure_001",
      "obs_stairs_001",
      "obs_trees_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_cones_001",
      "label": "traffic cones",
      "normalized_label": "traffic cones",
      "object_type": "object",
      "colors": [
        "orange",
        "white"
      ],
      "material_appearance": [
        "plastic-like appearance"
      ],
      "location": "foreground",
      "count_reference": "count_cones_001",
      "confidence": 0.96
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "blue",
      "gray",
      "green",
      "orange",
      "purple",
      "white",
      "yellow"
    ],
    "lighting": [
      "diffuse lighting",
      "natural daylight"
    ],
    "shadows": [
      "soft shadows"
    ],
    "highlights": [
      "bright highlights on roof"
    ],
    "composition": [
      "background trees and sky",
      "centered stadium",
      "foreground cones and stairs"
    ],
    "camera_angle": "slightly elevated angle",
    "framing": "tight framing around stadium",
    "cropping": [],
    "depth": "deep depth of field",
    "motion_cues": [],
    "motifs": [
      "leaf emblem motif"
    ],
    "repeated_shapes": [
      "horizontal stripes on stadium",
      "rectangular panels on roof"
    ],
    "style_cues": [
      "detailed realistic style"
    ],
    "supporting_observation_ids": [
      "obs_clouds_001",
      "obs_cones_001",
      "obs_grass_001",
      "obs_pathway_001",
      "obs_pond_001",
      "obs_railings_001",
      "obs_sky_001",
      "obs_stadium_roof_001",
      "obs_stadium_structure_001",
      "obs_stairs_001",
      "obs_trees_001"
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
    "relationships_review": "not_applicable",
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
        "fact_env_003",
        "fact_env_008",
        "fact_env_009"
      ],
      "object_observation_ids": [
        "obs_cones_001",
        "obs_railings_001",
        "obs_stairs_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_env_001",
        "fact_env_002",
        "fact_env_004",
        "fact_env_005",
        "fact_env_006",
        "fact_env_007",
        "fact_env_010"
      ],
      "observation_ids": [
        "obs_clouds_001",
        "obs_grass_001",
        "obs_pathway_001",
        "obs_pond_001",
        "obs_sky_001",
        "obs_stadium_roof_001",
        "obs_stadium_structure_001",
        "obs_trees_001"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_stadium_roof_001",
        "obs_stadium_structure_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_clouds_001",
        "obs_sky_001"
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
        "fact_env_003"
      ],
      "count_ids": [
        "count_cones_001"
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
        "stadium structure",
        "green leaf emblem",
        "stadium roof",
        "traffic cones",
        "metal railings",
        "stairs",
        "pond"
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
          "field_path": "name_text_observation_ids",
          "reason": "Name text partially blurred in image",
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
      "review_status": "not_applicable",
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
      "term": "stadium structure",
      "supporting_observation_ids": [
        "obs_stadium_structure_001"
      ]
    },
    {
      "term": "green leaf emblem",
      "supporting_observation_ids": [
        "obs_green_leaf_emblem_001"
      ]
    },
    {
      "term": "stadium roof",
      "supporting_observation_ids": [
        "obs_stadium_roof_001"
      ]
    },
    {
      "term": "traffic cones",
      "supporting_observation_ids": [
        "obs_cones_001"
      ]
    },
    {
      "term": "metal railings",
      "supporting_observation_ids": [
        "obs_railings_001"
      ]
    },
    {
      "term": "stairs",
      "supporting_observation_ids": [
        "obs_stairs_001"
      ]
    },
    {
      "term": "pond",
      "supporting_observation_ids": [
        "obs_pond_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "building",
        "source_observation_ids": [
          "obs_stadium_roof_001",
          "obs_stadium_structure_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "cloud",
        "source_observation_ids": [
          "obs_clouds_001",
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
        "confidence": 0.98
      },
      {
        "concept": "terrain",
        "source_observation_ids": [
          "obs_grass_001",
          "obs_pathway_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
      },
      {
        "concept": "tree",
        "source_observation_ids": [
          "obs_trees_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
      },
      {
        "concept": "water",
        "source_observation_ids": [
          "obs_pond_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-PMCG6-085 - Cinnabar City Gym

- Branch: `stadium`
- Review status: `needs_review`
- Description confidence: `0.99`
- Attribute confidence: `0.99`
- Cost USD: `0.006798`
- Artwork observations: `5`
- Card UI / print-marker observations: `0`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. No confident visible fact observations were extracted.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| lava flowing from pipe | lava flowing from pipe | environment | midground | prominent | 0.99 |
| pool of lava | pool of lava | environment | midground | prominent | 0.99 |
| rocky cavern walls | rocky cavern walls | environment | background | prominent | 0.98 |
| metal pipe with lava flowing out | metal pipe with lava flowing out | environment | midground | prominent | 0.98 |
| platform with red and black triangular design and white Poké Ball symbol | platform | objects_and_props | midground | prominent | 0.99 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| none recorded | | | | |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_env_lava_flow_001 | environment | lava flowing from pipe | obs_env_lava_flow_001 | 0.99 |
| fact_env_lava_pool_001 | environment | pool of lava at bottom | obs_env_lava_pool_001 | 0.99 |
| fact_env_cavern_walls_001 | environment | rocky cavern walls surrounding | obs_env_dried_rocky_walls_001 | 0.98 |
| fact_env_pipe_lava_001 | environment | metal pipe emitting lava | obs_env_pipes_001 | 0.98 |
| fact_obj_platform_001 | objects_and_props | platform with red and black triangular design and white Poké Ball symbol | obs_object_platform_001 | 0.99 |

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
| subjects | none_visible | none | not_applicable |  |
| human_appearance | none_visible | none | not_applicable |  |
| creature_anatomy | none_visible | none | not_applicable |  |
| clothing | none_visible | none | not_applicable |  |
| objects_and_props | complete | none | high |  |
| environment | complete | none | high |  |
| composition | likely_complete | low | high |  |
| color_and_light | likely_complete | low | high |  |
| visual_effects | likely_complete | low | medium |  |
| card_ui_and_print_markers | none_visible | none | not_applicable |  |
| counts | none_visible | none | not_applicable |  |
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
| lava flowing from pipe | obs_env_lava_flow_001 |
| pool of lava | obs_env_lava_pool_001 |
| rocky cavern walls | obs_env_dried_rocky_walls_001 |
| metal pipe with lava flowing out | obs_env_pipes_001 |
| platform | obs_object_platform_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| centered composition | obs_env_lava_flow_001, obs_env_pipes_001 | deterministic_rule | 0.92 |
| circular motif | obs_object_platform_001 | deterministic_rule | 0.92 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. No confident visible fact observations were extracted.
- Quality flags: `potential_count_reference_inconsistent`, `potential_module_review_conflicts_with_entries`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_env_lava_flow_001",
      "kind": "environment",
      "label": "lava flowing from pipe",
      "normalized_label": "lava flowing from pipe",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_env_lava_pool_001",
      "kind": "environment",
      "label": "pool of lava",
      "normalized_label": "pool of lava",
      "scene_layer": "midground",
      "frame_position": "bottom_center",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_env_dried_rocky_walls_001",
      "kind": "environment",
      "label": "rocky cavern walls",
      "normalized_label": "rocky cavern walls",
      "scene_layer": "background",
      "frame_position": "background_entire",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_env_pipes_001",
      "kind": "environment",
      "label": "metal pipe with lava flowing out",
      "normalized_label": "metal pipe with lava flowing out",
      "scene_layer": "midground",
      "frame_position": "upper_center",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_platform_001",
      "kind": "objects_and_props",
      "label": "platform with red and black triangular design and white Poké Ball symbol",
      "normalized_label": "platform",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 0.99,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_env_lava_flow_001",
      "module": "environment",
      "field_path": "lava_flow",
      "claim": "lava flowing from pipe",
      "value": "true",
      "supporting_observation_ids": [
        "obs_env_lava_flow_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_lava_pool_001",
      "module": "environment",
      "field_path": "lava_pool",
      "claim": "pool of lava at bottom",
      "value": "true",
      "supporting_observation_ids": [
        "obs_env_lava_pool_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_cavern_walls_001",
      "module": "environment",
      "field_path": "rocky_cavern_walls",
      "claim": "rocky cavern walls surrounding",
      "value": "true",
      "supporting_observation_ids": [
        "obs_env_dried_rocky_walls_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_pipe_lava_001",
      "module": "environment",
      "field_path": "pipe_lava_flow",
      "claim": "metal pipe emitting lava",
      "value": "true",
      "supporting_observation_ids": [
        "obs_env_pipes_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_platform_001",
      "module": "objects_and_props",
      "field_path": "platform",
      "claim": "platform with red and black triangular design and white Poké Ball symbol",
      "value": "true",
      "supporting_observation_ids": [
        "obs_object_platform_001"
      ],
      "confidence": 0.99,
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
      "obs_env_lava_flow_001",
      "obs_env_lava_pool_001",
      "obs_env_pipes_001",
      "obs_object_platform_001"
    ],
    "background": [
      "obs_env_dried_rocky_walls_001"
    ]
  },
  "environment": {
    "setting": [
      "lava environment",
      "rocky cavern"
    ],
    "indoor_outdoor": "indoor",
    "sky": [],
    "ground": [
      "lava pool"
    ],
    "terrain": [
      "rocky walls"
    ],
    "plants": [],
    "architecture": [
      "metal pipe"
    ],
    "water": [],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_env_dried_rocky_walls_001",
      "obs_env_lava_flow_001",
      "obs_env_lava_pool_001",
      "obs_env_pipes_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_object_platform_001",
      "label": "platform",
      "normalized_label": "platform",
      "object_type": "platform",
      "colors": [
        "black",
        "red",
        "white"
      ],
      "material_appearance": [
        "flat",
        "smooth"
      ],
      "location": "center",
      "count_reference": "count_platform_001",
      "confidence": 0.99
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "grey",
      "red",
      "yellow"
    ],
    "lighting": [
      "warm glow from lava"
    ],
    "shadows": [
      "shadow under platform"
    ],
    "highlights": [
      "glossy highlights on lava",
      "reflective areas on pipe"
    ],
    "composition": [
      "central platform framed by lava and pipe"
    ],
    "camera_angle": "straight-on",
    "framing": "tight cropping around platform and lava",
    "cropping": [
      "top and bottom borders of card visible"
    ],
    "depth": "medium depth with foreground lava and background rocks",
    "motion_cues": [
      "flowing lava"
    ],
    "motifs": [
      "fire colors",
      "lava theme"
    ],
    "repeated_shapes": [
      "round Poké Ball symbol",
      "triangular pattern on platform"
    ],
    "style_cues": [
      "dramatic lighting",
      "realistic"
    ],
    "supporting_observation_ids": [
      "obs_env_dried_rocky_walls_001",
      "obs_env_lava_flow_001",
      "obs_env_lava_pool_001",
      "obs_env_pipes_001",
      "obs_object_platform_001"
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
        "fact_obj_platform_001"
      ],
      "object_observation_ids": [
        "obs_object_platform_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_env_cavern_walls_001",
        "fact_env_lava_flow_001",
        "fact_env_lava_pool_001",
        "fact_env_pipe_lava_001"
      ],
      "observation_ids": [
        "obs_env_dried_rocky_walls_001",
        "obs_env_lava_flow_001",
        "obs_env_lava_pool_001",
        "obs_env_pipes_001"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_object_platform_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_env_lava_flow_001",
        "obs_env_lava_pool_001",
        "obs_env_pipes_001",
        "obs_object_platform_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": [
        "obs_env_lava_flow_001"
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
        "lava flowing from pipe",
        "pool of lava",
        "rocky cavern walls",
        "metal pipe with lava flowing out",
        "platform"
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
      "evidence_quality": "medium",
      "abstentions": []
    },
    {
      "module": "card_ui_and_print_markers",
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
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
      "term": "lava flowing from pipe",
      "supporting_observation_ids": [
        "obs_env_lava_flow_001"
      ]
    },
    {
      "term": "pool of lava",
      "supporting_observation_ids": [
        "obs_env_lava_pool_001"
      ]
    },
    {
      "term": "rocky cavern walls",
      "supporting_observation_ids": [
        "obs_env_dried_rocky_walls_001"
      ]
    },
    {
      "term": "metal pipe with lava flowing out",
      "supporting_observation_ids": [
        "obs_env_pipes_001"
      ]
    },
    {
      "term": "platform",
      "supporting_observation_ids": [
        "obs_object_platform_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "centered composition",
        "source_observation_ids": [
          "obs_env_lava_flow_001",
          "obs_env_pipes_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "circular motif",
        "source_observation_ids": [
          "obs_object_platform_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-TCGCOLLECTOR11525-019 - High Pressure System

- Branch: `stadium`
- Review status: `needs_review`
- Description confidence: `0.99`
- Attribute confidence: `0.98`
- Cost USD: `0.0082468`
- Artwork observations: `10`
- Card UI / print-marker observations: `0`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. Visible observations: blue sky, white clouds, bright sun, palm trees, palm trees, rocky ground, grass patch with symbol, stone stairs. Semantic facts: outdoor, palm trees. Counts: palm trees: 5.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| blue sky | blue sky | environment_element | background | medium | 0.99 |
| white clouds | white clouds | environment_element | background | medium | 0.98 |
| bright sun | bright sun | environment_element | background | medium | 0.97 |
| sun rays light beams | sun rays light beams | visual_effect | background | low | 0.95 |
| palm trees | palm trees | environment_element | midground | high | 0.99 |
| five palm trees | palm trees | count | midground | high | 0.99 |
| rocky ground | rocky ground | environment_element | foreground | high | 0.98 |
| grass patch with symbol | grass patch with symbol | environment_element | foreground | high | 0.98 |
| stone stairs | stone stairs | environment_element | foreground | medium | 0.97 |
| rock wall | rock wall | environment_element | background | medium | 0.96 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| none recorded | | | | |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_count_001 | counts | exact palm tree count | obs_tree_count_001 | 0.99 |
| fact_environment_001 | environment | presence of blue sky | obs_sky_001 | 0.99 |
| fact_environment_002 | environment | presence of white clouds | obs_clouds_001 | 0.98 |
| fact_environment_003 | environment | visible bright sun | obs_sun_001 | 0.97 |
| fact_environment_004 | visual_effects | presence of sun rays light beams | obs_light_rays_001 | 0.95 |
| fact_environment_005 | environment | presence of palm trees | obs_trees_001 | 0.99 |
| fact_environment_006 | environment | presence of rocky ground | obs_terrain_001 | 0.98 |
| fact_environment_007 | environment | presence of grass patch with symbol | obs_terrain_002 | 0.98 |
| fact_environment_008 | environment | presence of stone stairs | obs_stairs_001 | 0.97 |
| fact_environment_009 | environment | presence of rock wall | obs_wall_001 | 0.96 |

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
| composition | none_visible | none | high |  |
| color_and_light | none_visible | none | high |  |
| visual_effects | complete | none | high |  |
| card_ui_and_print_markers | none_visible | none | high |  |
| counts | complete | none | high |  |
| relationships | none_visible | none | high |  |
| surface_and_scan_cues | none_visible | none | high |  |
| uncertainty_and_abstentions | none_visible | none | high |  |
| fact_grounded_search_terms | none_visible | none | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| semfact_001 | environment | outdoor |  | obs_sky_001, obs_terrain_001, obs_trees_001 | blue sky palm trees rocky ground | 0.99 |
| semfact_002 | environment | palm trees |  | obs_tree_count_001, obs_trees_001 | palm trees | 0.99 |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| palm trees | exact | 5 | obs_tree_count_001 | 0.99 |

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
| blue sky | obs_sky_001 |
| white clouds | obs_clouds_001 |
| bright sun | obs_sun_001 |
| palm trees | obs_trees_001 |
| rocky ground | obs_terrain_001 |
| grass patch with symbol | obs_terrain_002 |
| stone stairs | obs_stairs_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| centered composition | obs_terrain_002 | deterministic_rule | 0.92 |
| circular motif | obs_terrain_002 | deterministic_rule | 0.92 |
| cloud | obs_clouds_001 | deterministic_rule | 0.98 |
| outdoor | obs_sky_001, obs_terrain_001, obs_trees_001 | deterministic_rule | 0.99 |
| palm trees | obs_tree_count_001, obs_trees_001 | deterministic_rule | 0.99 |
| sky | obs_sky_001 | deterministic_rule | 0.99 |
| terrain | obs_terrain_001, obs_terrain_002, obs_wall_001 | deterministic_rule | 0.98 |
| tree | obs_tree_count_001, obs_trees_001 | deterministic_rule | 0.99 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: blue sky, white clouds, bright sun, palm trees, palm trees, rocky ground, grass patch with symbol, stone stairs. Semantic facts: outdoor, palm trees. Counts: palm trees: 5.
- Quality flags: `potential_module_review_conflicts_with_entries`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_sky_001",
      "kind": "environment_element",
      "label": "blue sky",
      "normalized_label": "blue sky",
      "scene_layer": "background",
      "frame_position": "full_frame",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clouds_001",
      "kind": "environment_element",
      "label": "white clouds",
      "normalized_label": "white clouds",
      "scene_layer": "background",
      "frame_position": "full_frame",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_sun_001",
      "kind": "environment_element",
      "label": "bright sun",
      "normalized_label": "bright sun",
      "scene_layer": "background",
      "frame_position": "background_center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_light_rays_001",
      "kind": "visual_effect",
      "label": "sun rays light beams",
      "normalized_label": "sun rays light beams",
      "scene_layer": "background",
      "frame_position": "background_center",
      "visibility": "fully_visible",
      "salience": "low",
      "confidence": 0.95,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_trees_001",
      "kind": "environment_element",
      "label": "palm trees",
      "normalized_label": "palm trees",
      "scene_layer": "midground",
      "frame_position": "midground",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_tree_count_001",
      "kind": "count",
      "label": "five palm trees",
      "normalized_label": "palm trees",
      "scene_layer": "midground",
      "frame_position": "midground",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_terrain_001",
      "kind": "environment_element",
      "label": "rocky ground",
      "normalized_label": "rocky ground",
      "scene_layer": "foreground",
      "frame_position": "foreground_center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_terrain_002",
      "kind": "environment_element",
      "label": "grass patch with symbol",
      "normalized_label": "grass patch with symbol",
      "scene_layer": "foreground",
      "frame_position": "foreground_center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_stairs_001",
      "kind": "environment_element",
      "label": "stone stairs",
      "normalized_label": "stone stairs",
      "scene_layer": "foreground",
      "frame_position": "foreground_center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_wall_001",
      "kind": "environment_element",
      "label": "rock wall",
      "normalized_label": "rock wall",
      "scene_layer": "background",
      "frame_position": "background_center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_count_001",
      "module": "counts",
      "field_path": "palm_trees.count",
      "claim": "exact palm tree count",
      "value": "5",
      "supporting_observation_ids": [
        "obs_tree_count_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "sky",
      "claim": "presence of blue sky",
      "value": "blue sky",
      "supporting_observation_ids": [
        "obs_sky_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_002",
      "module": "environment",
      "field_path": "clouds",
      "claim": "presence of white clouds",
      "value": "white clouds",
      "supporting_observation_ids": [
        "obs_clouds_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_003",
      "module": "environment",
      "field_path": "sun",
      "claim": "visible bright sun",
      "value": "bright sun",
      "supporting_observation_ids": [
        "obs_sun_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_004",
      "module": "visual_effects",
      "field_path": "light_rays",
      "claim": "presence of sun rays light beams",
      "value": "sun rays light beams",
      "supporting_observation_ids": [
        "obs_light_rays_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_environment_005",
      "module": "environment",
      "field_path": "trees",
      "claim": "presence of palm trees",
      "value": "palm trees",
      "supporting_observation_ids": [
        "obs_trees_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_006",
      "module": "environment",
      "field_path": "terrain",
      "claim": "presence of rocky ground",
      "value": "rocky ground",
      "supporting_observation_ids": [
        "obs_terrain_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_007",
      "module": "environment",
      "field_path": "terrain",
      "claim": "presence of grass patch with symbol",
      "value": "grass patch with symbol",
      "supporting_observation_ids": [
        "obs_terrain_002"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_008",
      "module": "environment",
      "field_path": "structures",
      "claim": "presence of stone stairs",
      "value": "stone stairs",
      "supporting_observation_ids": [
        "obs_stairs_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_009",
      "module": "environment",
      "field_path": "structures",
      "claim": "presence of rock wall",
      "value": "rock wall",
      "supporting_observation_ids": [
        "obs_wall_001"
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
      "count_id": "count_palm_trees_001",
      "normalized_label": "palm trees",
      "count_type": "exact",
      "exact_count": 5,
      "estimated_min": 5,
      "estimated_max": 5,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_tree_count_001"
      ],
      "scene_layer": "midground",
      "confidence": 0.99
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_stairs_001",
      "obs_terrain_001",
      "obs_terrain_002"
    ],
    "midground": [
      "obs_tree_count_001",
      "obs_trees_001"
    ],
    "background": [
      "obs_clouds_001",
      "obs_light_rays_001",
      "obs_sky_001",
      "obs_sun_001",
      "obs_wall_001"
    ]
  },
  "environment": {
    "setting": [
      "outdoor"
    ],
    "indoor_outdoor": "outdoor",
    "sky": [
      "blue sky",
      "white clouds"
    ],
    "ground": [
      "grass patch with symbol",
      "rocky ground",
      "stone stairs"
    ],
    "terrain": [
      "grass patch with symbol",
      "rocky ground"
    ],
    "plants": [
      "palm trees"
    ],
    "architecture": [
      "rock wall",
      "stone stairs"
    ],
    "water": [],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_clouds_001",
      "obs_light_rays_001",
      "obs_sky_001",
      "obs_stairs_001",
      "obs_sun_001",
      "obs_terrain_001",
      "obs_terrain_002",
      "obs_tree_count_001",
      "obs_trees_001",
      "obs_wall_001"
    ]
  },
  "objects_and_props": [],
  "relationships": [],
  "visual_design": {
    "palette": [
      "blue",
      "brown",
      "green",
      "white",
      "yellow"
    ],
    "lighting": [
      "bright",
      "sunlit"
    ],
    "shadows": [
      "soft shadows"
    ],
    "highlights": [
      "sunlight highlights"
    ],
    "composition": [
      "centered grassy patch with symbol",
      "framing palm trees"
    ],
    "camera_angle": "straight-on",
    "framing": "centered",
    "cropping": [],
    "depth": "deep",
    "motion_cues": [],
    "motifs": [
      "circular symbol on grass patch"
    ],
    "repeated_shapes": [
      "palm tree shapes"
    ],
    "style_cues": [
      "realistic"
    ],
    "supporting_observation_ids": [
      "obs_clouds_001",
      "obs_light_rays_001",
      "obs_sky_001",
      "obs_stairs_001",
      "obs_sun_001",
      "obs_terrain_002",
      "obs_trees_001"
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
        "fact_environment_005",
        "fact_environment_006",
        "fact_environment_007",
        "fact_environment_008",
        "fact_environment_009"
      ],
      "observation_ids": [
        "obs_clouds_001",
        "obs_sky_001",
        "obs_stairs_001",
        "obs_sun_001",
        "obs_terrain_001",
        "obs_terrain_002",
        "obs_tree_count_001",
        "obs_trees_001",
        "obs_wall_001"
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
        "fact_environment_004"
      ],
      "observation_ids": [
        "obs_light_rays_001"
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
      "fact_ids": [
        "fact_count_001"
      ],
      "count_ids": [
        "count_palm_trees_001"
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
        "blue sky",
        "white clouds",
        "bright sun",
        "palm trees",
        "rocky ground",
        "grass patch with symbol",
        "stone stairs"
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
      "semantic_fact_id": "semfact_001",
      "category": "environment",
      "label": "outdoor",
      "subject_observation_id": "",
      "supporting_observation_ids": [
        "obs_sky_001",
        "obs_terrain_001",
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
          "blue sky",
          "palm trees",
          "rocky ground"
        ],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.99,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "semfact_002",
      "category": "environment",
      "label": "palm trees",
      "subject_observation_id": "",
      "supporting_observation_ids": [
        "obs_tree_count_001",
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
          "palm trees"
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
      "term": "blue sky",
      "supporting_observation_ids": [
        "obs_sky_001"
      ]
    },
    {
      "term": "white clouds",
      "supporting_observation_ids": [
        "obs_clouds_001"
      ]
    },
    {
      "term": "bright sun",
      "supporting_observation_ids": [
        "obs_sun_001"
      ]
    },
    {
      "term": "palm trees",
      "supporting_observation_ids": [
        "obs_trees_001"
      ]
    },
    {
      "term": "rocky ground",
      "supporting_observation_ids": [
        "obs_terrain_001"
      ]
    },
    {
      "term": "grass patch with symbol",
      "supporting_observation_ids": [
        "obs_terrain_002"
      ]
    },
    {
      "term": "stone stairs",
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
          "obs_terrain_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "circular motif",
        "source_observation_ids": [
          "obs_terrain_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "cloud",
        "source_observation_ids": [
          "obs_clouds_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "outdoor",
        "source_observation_ids": [
          "obs_sky_001",
          "obs_terrain_001",
          "obs_trees_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "palm trees",
        "source_observation_ids": [
          "obs_tree_count_001",
          "obs_trees_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
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
          "obs_terrain_001",
          "obs_terrain_002",
          "obs_wall_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "tree",
        "source_observation_ids": [
          "obs_tree_count_001",
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
- Review status: `pending`
- Description confidence: `0.96`
- Attribute confidence: `0.95`
- Cost USD: `0.0096916`
- Artwork observations: `9`
- Card UI / print-marker observations: `7`
- Card UI module evidence references: `7`
- Derived digest: Fact digest. Visible observations: bomb, bomb body, black panel, yellow stripe, bomb fuse, sparks, glowing fuse tip, blast. Counts: bomb: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| bomb | bomb | object | foreground | high | 0.99 |
| bomb body | bomb body | object | foreground | high | 0.98 |
| black panels on bomb body | black panel | object | foreground | medium | 0.95 |
| yellow stripes on bomb body | yellow stripe | object | foreground | medium | 0.95 |
| bomb fuse | bomb fuse | object | foreground | medium | 0.97 |
| sparks on fuse | sparks | visual_effect | foreground | medium | 0.96 |
| glowing fuse tip | glowing fuse tip | visual_effect | foreground | medium | 0.95 |
| orange and yellow blast around bomb | blast | visual_effect | foreground | high | 0.96 |
| blue radiant background | blue radiant background | environment | background | medium | 0.97 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card title text in Japanese | card_ui_text | top_left | fully_visible | 0.9 |
| top bar text in Japanese | card_ui_text | top_bar | fully_visible | 0.92 |
| bottom text box with Japanese instructions | card_ui_text | bottom | fully_visible | 0.93 |
| additional purple text box with Japanese text | card_ui_text | bottom | fully_visible | 0.92 |
| illustrator text 'Illus. Inose Yukie' | card_ui_text | bottom_left | fully_visible | 0.95 |
| set symbol with code 'J M5' | set_symbol | bottom_left | fully_visible | 0.94 |
| card number '106/081 SR' | card_ui_text | bottom_left | fully_visible | 0.95 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_obj_bomb_001 | objects_and_props | object is bomb | obs_obj_bomb_001, obs_obj_bomb_body_001 | 0.99 |
| fact_obj_bomb_body_panels_stripes_001 | objects_and_props | bomb has black panels and yellow stripes | obs_obj_bomb_panels_001, obs_obj_bomb_yellow_stripes_001 | 0.95 |
| fact_obj_bomb_fuse_001 | objects_and_props | bomb has lit fuse with sparks and glowing tip | obs_obj_bomb_fuse_001, obs_obj_bomb_fuse_sparks_001, obs_obj_bomb_glowing_fuse_tip_001 | 0.95 |
| fact_visual_effect_blast_001 | visual_effects | orange and yellow blast effect around bomb | obs_obj_bomb_blast_001 | 0.96 |
| fact_environment_background_001 | environment | blue radiant background | obs_bg_blue_focused_001 | 0.97 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_title_text_001 | card title text in Japanese visible | obs_text_top_left_001 | 0.9 |
| fact_card_ui_top_bar_text_001 | top bar text in Japanese visible | obs_text_top_bar_001 | 0.92 |
| fact_card_ui_bottom_text_001 | bottom text box with Japanese instructions visible | obs_text_bottom_001 | 0.93 |
| fact_card_ui_bottom_purple_text_001 | purple text box with Japanese text visible | obs_text_bottom_2_001 | 0.92 |
| fact_card_ui_illustrator_text_001 | illustrator text 'Illus. Inose Yukie' visible | obs_text_artist_001 | 0.95 |
| fact_card_ui_set_symbol_001 | set symbol with code 'J M5' visible | obs_symbol_set_001 | 0.94 |
| fact_card_ui_card_number_001 | card number '106/081 SR' visible | obs_text_card_number_001 | 0.95 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_bottom_purple_text_001",
    "fact_card_ui_bottom_text_001",
    "fact_card_ui_card_number_001",
    "fact_card_ui_illustrator_text_001",
    "fact_card_ui_set_symbol_001",
    "fact_card_ui_title_text_001",
    "fact_card_ui_top_bar_text_001"
  ],
  "name_text_observation_ids": [
    "obs_text_top_left_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_text_card_number_001"
  ],
  "set_symbol_observation_ids": [
    "obs_symbol_set_001"
  ],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [],
  "bottom_line_text_observation_ids": [
    "obs_text_bottom_001",
    "obs_text_bottom_2_001"
  ],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_text_artist_001"
  ],
  "error_marker_observation_ids": [],
  "other_print_marker_observation_ids": [
    "obs_text_top_bar_001"
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
| environment | complete | low | high |  |
| composition | none_visible | none | not_applicable |  |
| color_and_light | none_visible | none | not_applicable |  |
| visual_effects | complete | none | high |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | complete | none | high |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | likely_complete | low | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| none recorded | | | | | | |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| bomb | exact | 1 | obs_obj_bomb_001 | 0.99 |

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
| bomb | obs_obj_bomb_001 |
| black and yellow bomb | obs_obj_bomb_001, obs_obj_bomb_panels_001, obs_obj_bomb_yellow_stripes_001 |
| lit fuse | obs_obj_bomb_fuse_001, obs_obj_bomb_fuse_sparks_001, obs_obj_bomb_glowing_fuse_tip_001 |
| spark | obs_obj_bomb_fuse_sparks_001 |
| orange blast | obs_obj_bomb_blast_001 |
| blue radiant background | obs_bg_blue_focused_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| centered composition | obs_obj_bomb_001 | deterministic_rule | 0.92 |
| glowing highlights | obs_obj_bomb_glowing_fuse_tip_001 | deterministic_rule | 0.95 |
| spark | obs_obj_bomb_fuse_sparks_001 | deterministic_rule | 0.96 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: bomb, bomb body, black panel, yellow stripe, bomb fuse, sparks, glowing fuse tip, blast. Counts: bomb: 1.
- Quality flags: `none`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_obj_bomb_001",
      "kind": "object",
      "label": "bomb",
      "normalized_label": "bomb",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_obj_bomb_body_001",
      "kind": "object",
      "label": "bomb body",
      "normalized_label": "bomb body",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_obj_bomb_panels_001",
      "kind": "object",
      "label": "black panels on bomb body",
      "normalized_label": "black panel",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_obj_bomb_yellow_stripes_001",
      "kind": "object",
      "label": "yellow stripes on bomb body",
      "normalized_label": "yellow stripe",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_obj_bomb_fuse_001",
      "kind": "object",
      "label": "bomb fuse",
      "normalized_label": "bomb fuse",
      "scene_layer": "foreground",
      "frame_position": "top_center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_obj_bomb_fuse_sparks_001",
      "kind": "visual_effect",
      "label": "sparks on fuse",
      "normalized_label": "sparks",
      "scene_layer": "foreground",
      "frame_position": "top_center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_obj_bomb_glowing_fuse_tip_001",
      "kind": "visual_effect",
      "label": "glowing fuse tip",
      "normalized_label": "glowing fuse tip",
      "scene_layer": "foreground",
      "frame_position": "top_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_obj_bomb_blast_001",
      "kind": "visual_effect",
      "label": "orange and yellow blast around bomb",
      "normalized_label": "blast",
      "scene_layer": "foreground",
      "frame_position": "full_card_center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bg_blue_focused_001",
      "kind": "environment",
      "label": "blue radiant background",
      "normalized_label": "blue radiant background",
      "scene_layer": "background",
      "frame_position": "full_card",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_text_top_left_001",
      "kind": "card_ui_text",
      "label": "card title text in Japanese",
      "normalized_label": "card title text",
      "scene_layer": "interface",
      "frame_position": "top_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_text_top_bar_001",
      "kind": "card_ui_text",
      "label": "top bar text in Japanese",
      "normalized_label": "top bar text",
      "scene_layer": "interface",
      "frame_position": "top_bar",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_text_bottom_001",
      "kind": "card_ui_text",
      "label": "bottom text box with Japanese instructions",
      "normalized_label": "bottom text box",
      "scene_layer": "interface",
      "frame_position": "bottom",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.93,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_text_bottom_2_001",
      "kind": "card_ui_text",
      "label": "additional purple text box with Japanese text",
      "normalized_label": "purple bottom text box",
      "scene_layer": "interface",
      "frame_position": "bottom",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_text_artist_001",
      "kind": "card_ui_text",
      "label": "illustrator text 'Illus. Inose Yukie'",
      "normalized_label": "illustrator text",
      "scene_layer": "interface",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_symbol_set_001",
      "kind": "set_symbol",
      "label": "set symbol with code 'J M5'",
      "normalized_label": "set symbol",
      "scene_layer": "interface",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_text_card_number_001",
      "kind": "card_ui_text",
      "label": "card number '106/081 SR'",
      "normalized_label": "card number",
      "scene_layer": "interface",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_obj_bomb_001",
      "module": "objects_and_props",
      "field_path": "objects_and_props[0]",
      "claim": "object is bomb",
      "value": "true",
      "supporting_observation_ids": [
        "obs_obj_bomb_001",
        "obs_obj_bomb_body_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_bomb_body_panels_stripes_001",
      "module": "objects_and_props",
      "field_path": "objects_and_props[0].details",
      "claim": "bomb has black panels and yellow stripes",
      "value": "true",
      "supporting_observation_ids": [
        "obs_obj_bomb_panels_001",
        "obs_obj_bomb_yellow_stripes_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_bomb_fuse_001",
      "module": "objects_and_props",
      "field_path": "objects_and_props[0].fuse",
      "claim": "bomb has lit fuse with sparks and glowing tip",
      "value": "true",
      "supporting_observation_ids": [
        "obs_obj_bomb_fuse_001",
        "obs_obj_bomb_fuse_sparks_001",
        "obs_obj_bomb_glowing_fuse_tip_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_visual_effect_blast_001",
      "module": "visual_effects",
      "field_path": "visual_effects[0]",
      "claim": "orange and yellow blast effect around bomb",
      "value": "true",
      "supporting_observation_ids": [
        "obs_obj_bomb_blast_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_background_001",
      "module": "environment",
      "field_path": "environment.setting[0]",
      "claim": "blue radiant background",
      "value": "blue radiant background",
      "supporting_observation_ids": [
        "obs_bg_blue_focused_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_title_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text[0]",
      "claim": "card title text in Japanese visible",
      "value": "ごうかいボム",
      "supporting_observation_ids": [
        "obs_text_top_left_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_top_bar_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "other_print_marker[0]",
      "claim": "top bar text in Japanese visible",
      "value": "ポケモンのどうぐ トレーナーズ",
      "supporting_observation_ids": [
        "obs_text_top_bar_001"
      ],
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_bottom_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text[0]",
      "claim": "bottom text box with Japanese instructions visible",
      "value": "true",
      "supporting_observation_ids": [
        "obs_text_bottom_001"
      ],
      "confidence": 0.93,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_bottom_purple_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text[1]",
      "claim": "purple text box with Japanese text visible",
      "value": "true",
      "supporting_observation_ids": [
        "obs_text_bottom_2_001"
      ],
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_illustrator_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text[0]",
      "claim": "illustrator text 'Illus. Inose Yukie' visible",
      "value": "true",
      "supporting_observation_ids": [
        "obs_text_artist_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_set_symbol_001",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol[0]",
      "claim": "set symbol with code 'J M5' visible",
      "value": "true",
      "supporting_observation_ids": [
        "obs_symbol_set_001"
      ],
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_card_number_001",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number[0]",
      "claim": "card number '106/081 SR' visible",
      "value": "106/081 SR",
      "supporting_observation_ids": [
        "obs_text_card_number_001"
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
      "estimated_min": 1,
      "estimated_max": 1,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_obj_bomb_001"
      ],
      "scene_layer": "foreground",
      "confidence": 0.99
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_obj_bomb_001",
      "obs_obj_bomb_blast_001",
      "obs_obj_bomb_body_001",
      "obs_obj_bomb_fuse_001",
      "obs_obj_bomb_fuse_sparks_001",
      "obs_obj_bomb_glowing_fuse_tip_001",
      "obs_obj_bomb_panels_001",
      "obs_obj_bomb_yellow_stripes_001"
    ],
    "midground": [],
    "background": [
      "obs_bg_blue_focused_001"
    ]
  },
  "environment": {
    "setting": [
      "blue radiant glow background"
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
      "obs_bg_blue_focused_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_obj_bomb_001",
      "label": "bomb",
      "normalized_label": "bomb",
      "object_type": "bomb-like",
      "colors": [
        "black",
        "yellow"
      ],
      "material_appearance": [
        "dark rounded body",
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
      "yellow"
    ],
    "lighting": [
      "glowing fuse tip",
      "high contrast",
      "spark effects"
    ],
    "shadows": [
      "soft on bomb body"
    ],
    "highlights": [
      "glowing fuse tip",
      "metallic-looking highlights"
    ],
    "composition": [
      "central bomb object",
      "radiant blast surrounding bomb"
    ],
    "camera_angle": "frontal overhead",
    "framing": "tight framing on bomb",
    "cropping": [
      "full bomb object visible"
    ],
    "depth": "medium depth",
    "motion_cues": [
      "spark flying on fuse"
    ],
    "motifs": [
      "circular bomb shape",
      "explosive",
      "radiant glow"
    ],
    "repeated_shapes": [
      "rectangular panels on bomb body"
    ],
    "style_cues": [
      "cartoon style",
      "Japanese card art"
    ],
    "supporting_observation_ids": [
      "obs_bg_blue_focused_001",
      "obs_obj_bomb_001",
      "obs_obj_bomb_blast_001",
      "obs_obj_bomb_fuse_001"
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
        "fact_obj_bomb_001",
        "fact_obj_bomb_body_panels_stripes_001",
        "fact_obj_bomb_fuse_001"
      ],
      "object_observation_ids": [
        "obs_obj_bomb_001",
        "obs_obj_bomb_body_001",
        "obs_obj_bomb_fuse_001",
        "obs_obj_bomb_fuse_sparks_001",
        "obs_obj_bomb_glowing_fuse_tip_001",
        "obs_obj_bomb_panels_001",
        "obs_obj_bomb_yellow_stripes_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_environment_background_001"
      ],
      "observation_ids": [
        "obs_bg_blue_focused_001"
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
        "fact_visual_effect_blast_001"
      ],
      "observation_ids": [
        "obs_obj_bomb_blast_001"
      ]
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_ui_bottom_purple_text_001",
        "fact_card_ui_bottom_text_001",
        "fact_card_ui_card_number_001",
        "fact_card_ui_illustrator_text_001",
        "fact_card_ui_set_symbol_001",
        "fact_card_ui_title_text_001",
        "fact_card_ui_top_bar_text_001"
      ],
      "name_text_observation_ids": [
        "obs_text_top_left_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_text_card_number_001"
      ],
      "set_symbol_observation_ids": [
        "obs_symbol_set_001"
      ],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [],
      "bottom_line_text_observation_ids": [
        "obs_text_bottom_001",
        "obs_text_bottom_2_001"
      ],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_text_artist_001"
      ],
      "error_marker_observation_ids": [],
      "other_print_marker_observation_ids": [
        "obs_text_top_bar_001"
      ]
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
        "black and yellow bomb",
        "lit fuse",
        "spark",
        "orange blast",
        "blue radiant background"
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
      "term": "bomb",
      "supporting_observation_ids": [
        "obs_obj_bomb_001"
      ]
    },
    {
      "term": "black and yellow bomb",
      "supporting_observation_ids": [
        "obs_obj_bomb_001",
        "obs_obj_bomb_panels_001",
        "obs_obj_bomb_yellow_stripes_001"
      ]
    },
    {
      "term": "lit fuse",
      "supporting_observation_ids": [
        "obs_obj_bomb_fuse_001",
        "obs_obj_bomb_fuse_sparks_001",
        "obs_obj_bomb_glowing_fuse_tip_001"
      ]
    },
    {
      "term": "spark",
      "supporting_observation_ids": [
        "obs_obj_bomb_fuse_sparks_001"
      ]
    },
    {
      "term": "orange blast",
      "supporting_observation_ids": [
        "obs_obj_bomb_blast_001"
      ]
    },
    {
      "term": "blue radiant background",
      "supporting_observation_ids": [
        "obs_bg_blue_focused_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "centered composition",
        "source_observation_ids": [
          "obs_obj_bomb_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "glowing highlights",
        "source_observation_ids": [
          "obs_obj_bomb_glowing_fuse_tip_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "spark",
        "source_observation_ids": [
          "obs_obj_bomb_fuse_sparks_001"
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
- Review status: `pending`
- Description confidence: `0.99`
- Attribute confidence: `0.95`
- Cost USD: `0.006734`
- Artwork observations: `4`
- Card UI / print-marker observations: `6`
- Card UI module evidence references: `5`
- Derived digest: Fact digest. Visible observations: bell, geometric shape, circle pattern, purple swirling vortex. Counts: bell: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| bell | bell | object | midground | high | 0.99 |
| bell handle top geometric shape | geometric shape | object | midground | medium | 0.95 |
| bell band decoration circle pattern | circle pattern | object | midground | medium | 0.95 |
| purple swirling vortex | purple swirling vortex | background | background | high | 0.98 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| Japanese name text ダークベル | card_ui_text | top center | visible | 0.99 |
| set code J M5 105/081 SR | card_ui_text | bottom left | visible | 0.98 |
| illustrator text Illus. Toysto Beach | card_ui_text | bottom left | visible | 0.98 |
| Japanese description text below bell | card_ui_text | lower center | visible | 0.97 |
| category label in Japanese グッズ (Goods) | card_ui_text | top left | visible | 0.98 |
| category label in Japanese トレーナーズ (Trainers) | card_ui_text | top right | visible | 0.98 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_obj_001 | objects_and_props | object presence | obs_obj_001 | 0.99 |
| fact_obj_002 | objects_and_props | geometric shape | obs_obj_002 | 0.95 |
| fact_obj_003 | objects_and_props | decorative pattern | obs_obj_003 | 0.95 |
| fact_env_001 | environment | background swirl pattern | obs_background_001 | 0.98 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_ui_name_001 | card name text | obs_ui_name_001 | 0.99 |
| fact_ui_set_001 | set code and number | obs_ui_set_001 | 0.98 |
| fact_ui_illus_001 | illustrator text | obs_ui_illus_001 | 0.98 |
| fact_ui_desc_001 | Japanese description text | obs_ui_text_001 | 0.97 |
| fact_ui_label_001 | category label Japanese | obs_ui_label_001 | 0.98 |
| fact_ui_label_002 | category label Japanese | obs_ui_label_002 | 0.98 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_ui_desc_001",
    "fact_ui_illus_001",
    "fact_ui_label_001",
    "fact_ui_label_002",
    "fact_ui_name_001",
    "fact_ui_set_001"
  ],
  "name_text_observation_ids": [
    "obs_ui_name_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_ui_set_001"
  ],
  "set_symbol_observation_ids": [],
  "rarity_mark_observation_ids": [
    "obs_ui_set_001"
  ],
  "copyright_line_observation_ids": [],
  "bottom_line_text_observation_ids": [
    "obs_ui_text_001"
  ],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_ui_illus_001"
  ],
  "error_marker_observation_ids": [],
  "other_print_marker_observation_ids": []
}
```

</details>

#### Module Completeness Reviews

| Module | Status | Omission risk | Evidence quality | Abstentions |
|---|---|---|---|---|
| subjects | none_visible | none | not_applicable |  |
| human_appearance | none_visible | none | not_applicable |  |
| creature_anatomy | none_visible | none | not_applicable |  |
| clothing | none_visible | none | not_applicable |  |
| objects_and_props | complete | none | high |  |
| environment | likely_complete | low | high |  |
| composition | likely_complete | low | high |  |
| color_and_light | likely_complete | low | high |  |
| visual_effects | likely_complete | low | high |  |
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
| bell | exact | 1 | obs_obj_001 | 0.99 |

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
| bell | obs_obj_001 |
| dark colored bell | obs_obj_001 |
| octagonal handle | obs_obj_002 |
| circle pattern decoration | obs_obj_003 |
| purple swirl background | obs_background_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| circular motif | obs_obj_003 | deterministic_rule | 0.95 |
| spiral motif | obs_background_001 | deterministic_rule | 0.98 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: bell, geometric shape, circle pattern, purple swirling vortex. Counts: bell: 1.
- Quality flags: `none`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_obj_001",
      "kind": "object",
      "label": "bell",
      "normalized_label": "bell",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_obj_002",
      "kind": "object",
      "label": "bell handle top geometric shape",
      "normalized_label": "geometric shape",
      "scene_layer": "midground",
      "frame_position": "top",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_obj_003",
      "kind": "object",
      "label": "bell band decoration circle pattern",
      "normalized_label": "circle pattern",
      "scene_layer": "midground",
      "frame_position": "mid",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_background_001",
      "kind": "background",
      "label": "purple swirling vortex",
      "normalized_label": "purple swirling vortex",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_ui_name_001",
      "kind": "card_ui_text",
      "label": "Japanese name text ダークベル",
      "normalized_label": "dark bell",
      "scene_layer": "foreground",
      "frame_position": "top center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_ui_set_001",
      "kind": "card_ui_text",
      "label": "set code J M5 105/081 SR",
      "normalized_label": "set code j m5 105/081 sr",
      "scene_layer": "foreground",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_ui_illus_001",
      "kind": "card_ui_text",
      "label": "illustrator text Illus. Toysto Beach",
      "normalized_label": "illus toysto beach",
      "scene_layer": "foreground",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_ui_text_001",
      "kind": "card_ui_text",
      "label": "Japanese description text below bell",
      "normalized_label": "description text",
      "scene_layer": "foreground",
      "frame_position": "lower center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_ui_label_001",
      "kind": "card_ui_text",
      "label": "category label in Japanese グッズ (Goods)",
      "normalized_label": "goods",
      "scene_layer": "foreground",
      "frame_position": "top left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_ui_label_002",
      "kind": "card_ui_text",
      "label": "category label in Japanese トレーナーズ (Trainers)",
      "normalized_label": "trainers",
      "scene_layer": "foreground",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_obj_001",
      "module": "objects_and_props",
      "field_path": "bell",
      "claim": "object presence",
      "value": "bell",
      "supporting_observation_ids": [
        "obs_obj_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_002",
      "module": "objects_and_props",
      "field_path": "bell.handle_top_shape",
      "claim": "geometric shape",
      "value": "octagonal prism",
      "supporting_observation_ids": [
        "obs_obj_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_003",
      "module": "objects_and_props",
      "field_path": "bell.band_pattern",
      "claim": "decorative pattern",
      "value": "concentric circles",
      "supporting_observation_ids": [
        "obs_obj_003"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_001",
      "module": "environment",
      "field_path": "background",
      "claim": "background swirl pattern",
      "value": "purple swirling vortex",
      "supporting_observation_ids": [
        "obs_background_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_name_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text",
      "value": "ダークベル",
      "supporting_observation_ids": [
        "obs_ui_name_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_set_001",
      "module": "card_ui_and_print_markers",
      "field_path": "set_code_and_number",
      "claim": "set code and number",
      "value": "J M5 105/081 SR",
      "supporting_observation_ids": [
        "obs_ui_set_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_illus_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator text",
      "value": "Illus. Toysto Beach",
      "supporting_observation_ids": [
        "obs_ui_illus_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_desc_001",
      "module": "card_ui_and_print_markers",
      "field_path": "description_text",
      "claim": "Japanese description text",
      "value": "visible below bell",
      "supporting_observation_ids": [
        "obs_ui_text_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_label_001",
      "module": "card_ui_and_print_markers",
      "field_path": "category_label_left",
      "claim": "category label Japanese",
      "value": "グッズ (Goods)",
      "supporting_observation_ids": [
        "obs_ui_label_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_label_002",
      "module": "card_ui_and_print_markers",
      "field_path": "category_label_right",
      "claim": "category label Japanese",
      "value": "トレーナーズ (Trainers)",
      "supporting_observation_ids": [
        "obs_ui_label_002"
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
      "normalized_label": "bell",
      "count_type": "exact",
      "exact_count": 1,
      "estimated_min": 1,
      "estimated_max": 1,
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
      "obs_ui_illus_001",
      "obs_ui_label_001",
      "obs_ui_label_002",
      "obs_ui_name_001",
      "obs_ui_set_001",
      "obs_ui_text_001"
    ],
    "midground": [
      "obs_obj_001",
      "obs_obj_002",
      "obs_obj_003"
    ],
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
      "observation_id": "obs_obj_001",
      "label": "bell",
      "normalized_label": "bell",
      "object_type": "tool-like object",
      "colors": [
        "black",
        "dark blue",
        "gray",
        "white highlight"
      ],
      "material_appearance": [
        "bright highlight on body",
        "dark rounded body",
        "white outline"
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
      "dark blue",
      "purple",
      "white"
    ],
    "lighting": [
      "central glow behind bell",
      "highlights on bell edges"
    ],
    "shadows": [
      "bell shading for volume"
    ],
    "highlights": [
      "bright white edges",
      "center glowing orb"
    ],
    "composition": [
      "bell centered",
      "bell slightly tilted",
      "vortex swirl background"
    ],
    "camera_angle": "straight-on view",
    "framing": "full bell visible with some margin",
    "cropping": [],
    "depth": "high depth by shading and highlights",
    "motion_cues": [
      "vortex swirl suggests motion"
    ],
    "motifs": [
      "concentric circle patterns on bell band"
    ],
    "repeated_shapes": [
      "polygon facets on bell surface"
    ],
    "style_cues": [
      "stylized digital art"
    ],
    "supporting_observation_ids": [
      "obs_background_001",
      "obs_obj_001",
      "obs_obj_002",
      "obs_obj_003"
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
        "fact_obj_003"
      ],
      "object_observation_ids": [
        "obs_obj_001",
        "obs_obj_002",
        "obs_obj_003"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_env_001"
      ],
      "observation_ids": [
        "obs_background_001"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_background_001",
        "obs_obj_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_background_001",
        "obs_obj_001"
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
        "fact_ui_desc_001",
        "fact_ui_illus_001",
        "fact_ui_label_001",
        "fact_ui_label_002",
        "fact_ui_name_001",
        "fact_ui_set_001"
      ],
      "name_text_observation_ids": [
        "obs_ui_name_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_ui_set_001"
      ],
      "set_symbol_observation_ids": [],
      "rarity_mark_observation_ids": [
        "obs_ui_set_001"
      ],
      "copyright_line_observation_ids": [],
      "bottom_line_text_observation_ids": [
        "obs_ui_text_001"
      ],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_ui_illus_001"
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
        "bell",
        "dark colored bell",
        "octagonal handle",
        "circle pattern decoration",
        "purple swirl background"
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
      "omission_risk": "none",
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
      "term": "bell",
      "supporting_observation_ids": [
        "obs_obj_001"
      ]
    },
    {
      "term": "dark colored bell",
      "supporting_observation_ids": [
        "obs_obj_001"
      ]
    },
    {
      "term": "octagonal handle",
      "supporting_observation_ids": [
        "obs_obj_002"
      ]
    },
    {
      "term": "circle pattern decoration",
      "supporting_observation_ids": [
        "obs_obj_003"
      ]
    },
    {
      "term": "purple swirl background",
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
          "obs_obj_003"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "spiral motif",
        "source_observation_ids": [
          "obs_background_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-074 - リトライバッジ

- Branch: `item_tool_supporter`
- Review status: `needs_review`
- Description confidence: `0.98`
- Attribute confidence: `0.95`
- Cost USD: `0.0090136`
- Artwork observations: `7`
- Card UI / print-marker observations: `7`
- Card UI module evidence references: `4`
- Derived digest: Fact digest. Visible observations: star-shaped badge, circular base, pentagonal star, ribbons, silver, white, light blue background. Counts: star-shaped badge: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| star-shaped badge | star-shaped badge | object | foreground | high | 1 |
| circular base behind star | circular base | object_part | foreground | medium | 1 |
| 3D pentagonal star shape | pentagonal star | object_part | foreground | high | 1 |
| two downward pointing ribbons | ribbons | object_part | foreground | medium | 1 |
| silvery metallic | silver | color | foreground | high | 1 |
| white star center | white | color | foreground | high | 1 |
| light blue swirling background | light blue background | color | background | medium | 1 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| リトライバッジ | card_name_text | top_left | visible | 1 |
| ポケモンのどうぐ | card_ui_text | top_bar | visible | 1 |
| トレーナーズ | card_ui_text | top_bar_right | visible | 1 |
| Illus. Toyste Beach | illustrator_text | bottom_left | visible | 1 |
| J m5 | set_symbol | bottom_left_next_to_number | visible | 1 |
| 074/081 | collector_number | bottom_left_next_to_set_symbol | visible | 1 |
| U | card_ui_text | bottom_right | visible | 1 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_object_badge_001 | objects_and_props | main object is a star-shaped badge | obs_object_badge_001 | 1 |
| fact_object_badge_parts_001 | objects_and_props | badge has circular base, pentagonal star, and two ribbons | obs_object_badge_body_001, obs_object_badge_ribbons_001, obs_object_badge_star_001 | 1 |
| fact_color_silver_001 | color_and_light | badge color is silver metallic | obs_color_silver_001 | 1 |
| fact_color_white_001 | color_and_light | star center is white | obs_color_white_001 | 1 |
| fact_color_background_001 | color_and_light | background is light blue swirling pattern | obs_color_light_blue_bg_001 | 1 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_name_001 | card name text visible | obs_card_ui_name_text_001 | 1 |
| fact_card_top_bar_001 | top bar text visible | obs_card_ui_top_bar_001 | 1 |
| fact_card_trainer_text_001 | trainer text visible | obs_card_ui_trainer_text_001 | 1 |
| fact_illustrator_001 | illustrator text visible | obs_card_ui_illustrator_text_001 | 1 |
| fact_set_symbol_001 | set symbol visible | obs_card_ui_set_symbol_001 | 1 |
| fact_collector_number_001 | collector number visible | obs_card_ui_collector_number_001 | 1 |
| fact_bottom_right_mark_001 | bottom right text visible | obs_card_ui_bottom_right_mark_001 | 1 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_bottom_right_mark_001",
    "fact_card_name_001",
    "fact_card_top_bar_001",
    "fact_card_trainer_text_001",
    "fact_collector_number_001",
    "fact_illustrator_001",
    "fact_set_symbol_001"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_name_text_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_card_ui_collector_number_001"
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
| subjects | none_visible | none | not_applicable |  |
| human_appearance | none_visible | none | not_applicable |  |
| creature_anatomy | none_visible | none | not_applicable |  |
| clothing | none_visible | none | not_applicable |  |
| objects_and_props | complete | low | high |  |
| environment | complete | low | high |  |
| composition | complete | low | high |  |
| color_and_light | complete | low | high |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | complete | low | high |  |
| counts | complete | low | high |  |
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
| star-shaped badge | exact | 1 | obs_object_badge_001 | 1 |

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
| star-shaped badge | obs_object_badge_001 |
| circular base | obs_object_badge_body_001 |
| pentagonal star | obs_object_badge_star_001 |
| ribbons | obs_object_badge_ribbons_001 |
| silver | obs_color_silver_001 |
| white | obs_color_white_001 |
| light blue background | obs_color_light_blue_bg_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| circular motif | obs_object_badge_body_001 | deterministic_rule | 1 |
| radial lines | obs_color_light_blue_bg_001 | deterministic_rule | 0.92 |
| spiral motif | obs_color_light_blue_bg_001 | deterministic_rule | 0.92 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: star-shaped badge, circular base, pentagonal star, ribbons, silver, white, light blue background. Counts: star-shaped badge: 1.
- Quality flags: `potential_module_review_conflicts_with_entries`
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
      "scene_layer": "card_ui",
      "frame_position": "top_left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_top_bar_001",
      "kind": "card_ui_text",
      "label": "ポケモンのどうぐ",
      "normalized_label": "ポケモンのどうぐ",
      "scene_layer": "card_ui",
      "frame_position": "top_bar",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_trainer_text_001",
      "kind": "card_ui_text",
      "label": "トレーナーズ",
      "normalized_label": "トレーナーズ",
      "scene_layer": "card_ui",
      "frame_position": "top_bar_right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_illustrator_text_001",
      "kind": "illustrator_text",
      "label": "Illus. Toyste Beach",
      "normalized_label": "Illus. Toyste Beach",
      "scene_layer": "card_ui",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "low",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_symbol_001",
      "kind": "set_symbol",
      "label": "J m5",
      "normalized_label": "jpn-m5",
      "scene_layer": "card_ui",
      "frame_position": "bottom_left_next_to_number",
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
      "scene_layer": "card_ui",
      "frame_position": "bottom_left_next_to_set_symbol",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_bottom_right_mark_001",
      "kind": "card_ui_text",
      "label": "U",
      "normalized_label": "U",
      "scene_layer": "card_ui",
      "frame_position": "bottom_right",
      "visibility": "visible",
      "salience": "low",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_badge_001",
      "kind": "object",
      "label": "star-shaped badge",
      "normalized_label": "star-shaped badge",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_badge_body_001",
      "kind": "object_part",
      "label": "circular base behind star",
      "normalized_label": "circular base",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_badge_star_001",
      "kind": "object_part",
      "label": "3D pentagonal star shape",
      "normalized_label": "pentagonal star",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_badge_ribbons_001",
      "kind": "object_part",
      "label": "two downward pointing ribbons",
      "normalized_label": "ribbons",
      "scene_layer": "foreground",
      "frame_position": "below_center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_silver_001",
      "kind": "color",
      "label": "silvery metallic",
      "normalized_label": "silver",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_white_001",
      "kind": "color",
      "label": "white star center",
      "normalized_label": "white",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_light_blue_bg_001",
      "kind": "color",
      "label": "light blue swirling background",
      "normalized_label": "light blue background",
      "scene_layer": "background",
      "frame_position": "behind_badge",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_card_name_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text visible",
      "value": "リトライバッジ",
      "supporting_observation_ids": [
        "obs_card_ui_name_text_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_top_bar_001",
      "module": "card_ui_and_print_markers",
      "field_path": "top_bar_text",
      "claim": "top bar text visible",
      "value": "ポケモンのどうぐ",
      "supporting_observation_ids": [
        "obs_card_ui_top_bar_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_trainer_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "top_bar_trainer_text",
      "claim": "trainer text visible",
      "value": "トレーナーズ",
      "supporting_observation_ids": [
        "obs_card_ui_trainer_text_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_illustrator_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator text visible",
      "value": "Illus. Toyste Beach",
      "supporting_observation_ids": [
        "obs_card_ui_illustrator_text_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_set_symbol_001",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "set symbol visible",
      "value": "J m5",
      "supporting_observation_ids": [
        "obs_card_ui_set_symbol_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_collector_number_001",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "collector number visible",
      "value": "074/081",
      "supporting_observation_ids": [
        "obs_card_ui_collector_number_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_bottom_right_mark_001",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_right_text",
      "claim": "bottom right text visible",
      "value": "U",
      "supporting_observation_ids": [
        "obs_card_ui_bottom_right_mark_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_object_badge_001",
      "module": "objects_and_props",
      "field_path": "main_object",
      "claim": "main object is a star-shaped badge",
      "value": "star-shaped badge",
      "supporting_observation_ids": [
        "obs_object_badge_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_object_badge_parts_001",
      "module": "objects_and_props",
      "field_path": "object_parts",
      "claim": "badge has circular base, pentagonal star, and two ribbons",
      "value": "circular base, pentagonal star, two ribbons",
      "supporting_observation_ids": [
        "obs_object_badge_body_001",
        "obs_object_badge_ribbons_001",
        "obs_object_badge_star_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_color_silver_001",
      "module": "color_and_light",
      "field_path": "colors",
      "claim": "badge color is silver metallic",
      "value": "silver metallic",
      "supporting_observation_ids": [
        "obs_color_silver_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_color_white_001",
      "module": "color_and_light",
      "field_path": "colors",
      "claim": "star center is white",
      "value": "white",
      "supporting_observation_ids": [
        "obs_color_white_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_color_background_001",
      "module": "color_and_light",
      "field_path": "background_colors",
      "claim": "background is light blue swirling pattern",
      "value": "light blue",
      "supporting_observation_ids": [
        "obs_color_light_blue_bg_001"
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
      "count_id": "count_001",
      "normalized_label": "star-shaped badge",
      "count_type": "exact",
      "exact_count": 1,
      "estimated_min": 0,
      "estimated_max": 0,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_object_badge_001"
      ],
      "scene_layer": "foreground",
      "confidence": 1
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_color_silver_001",
      "obs_color_white_001",
      "obs_object_badge_001",
      "obs_object_badge_body_001",
      "obs_object_badge_ribbons_001",
      "obs_object_badge_star_001"
    ],
    "midground": [],
    "background": [
      "obs_color_light_blue_bg_001"
    ]
  },
  "environment": {
    "setting": [
      "abstract swirl background"
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
      "obs_color_light_blue_bg_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_object_badge_001",
      "label": "star-shaped badge",
      "normalized_label": "star-shaped badge",
      "object_type": "badge-like object",
      "colors": [
        "silver",
        "white"
      ],
      "material_appearance": [
        "bright highlights",
        "metallic-looking"
      ],
      "location": "center",
      "count_reference": "count_001",
      "confidence": 1
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "light blue",
      "silver",
      "white"
    ],
    "lighting": [
      "bright highlights on badge"
    ],
    "shadows": [
      "soft shadows below ribbons"
    ],
    "highlights": [
      "metallic star edges"
    ],
    "composition": [
      "background radial swirl pattern",
      "central composition with badge"
    ],
    "camera_angle": "straight-on",
    "framing": "tight around badge and background swirl",
    "cropping": [],
    "depth": "shallow depth of field",
    "motion_cues": [],
    "motifs": [
      "ribbons",
      "star shape"
    ],
    "repeated_shapes": [
      "circular base",
      "star points"
    ],
    "style_cues": [
      "clean digital illustration"
    ],
    "supporting_observation_ids": [
      "obs_color_light_blue_bg_001",
      "obs_object_badge_001"
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
        "fact_object_badge_001",
        "fact_object_badge_parts_001"
      ],
      "object_observation_ids": [
        "obs_object_badge_001",
        "obs_object_badge_body_001",
        "obs_object_badge_ribbons_001",
        "obs_object_badge_star_001"
      ]
    },
    "environment": {
      "fact_ids": [],
      "observation_ids": [
        "obs_color_light_blue_bg_001"
      ]
    },
    "composition": {
      "fact_ids": [
        "fact_color_background_001"
      ],
      "observation_ids": [
        "obs_color_light_blue_bg_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [
        "fact_color_background_001",
        "fact_color_silver_001",
        "fact_color_white_001"
      ],
      "observation_ids": [
        "obs_color_light_blue_bg_001",
        "obs_color_silver_001",
        "obs_color_white_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": []
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_bottom_right_mark_001",
        "fact_card_name_001",
        "fact_card_top_bar_001",
        "fact_card_trainer_text_001",
        "fact_collector_number_001",
        "fact_illustrator_001",
        "fact_set_symbol_001"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_name_text_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_card_ui_collector_number_001"
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
        "obs_card_ui_illustrator_text_001"
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
        "star-shaped badge",
        "circular base",
        "pentagonal star",
        "ribbons",
        "silver",
        "white",
        "light blue background"
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
      "omission_risk": "low",
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
      "term": "star-shaped badge",
      "supporting_observation_ids": [
        "obs_object_badge_001"
      ]
    },
    {
      "term": "circular base",
      "supporting_observation_ids": [
        "obs_object_badge_body_001"
      ]
    },
    {
      "term": "pentagonal star",
      "supporting_observation_ids": [
        "obs_object_badge_star_001"
      ]
    },
    {
      "term": "ribbons",
      "supporting_observation_ids": [
        "obs_object_badge_ribbons_001"
      ]
    },
    {
      "term": "silver",
      "supporting_observation_ids": [
        "obs_color_silver_001"
      ]
    },
    {
      "term": "white",
      "supporting_observation_ids": [
        "obs_color_white_001"
      ]
    },
    {
      "term": "light blue background",
      "supporting_observation_ids": [
        "obs_color_light_blue_bg_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "circular motif",
        "source_observation_ids": [
          "obs_object_badge_body_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "radial lines",
        "source_observation_ids": [
          "obs_color_light_blue_bg_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "spiral motif",
        "source_observation_ids": [
          "obs_color_light_blue_bg_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-073 - ごうかいボム

- Branch: `item_tool_supporter`
- Review status: `pending`
- Description confidence: `0.95`
- Attribute confidence: `0.95`
- Cost USD: `0.0093656`
- Artwork observations: `8`
- Card UI / print-marker observations: `5`
- Card UI module evidence references: `4`
- Derived digest: Fact digest. Visible observations: bomb, bomb core body, yellow and black diagonal stripes, bomb fuse, spark, yellow sunburst explosion pattern, black hexagonal panels, orange and blue glow background. Counts: bomb: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| bomb | bomb | object | midground | high | 0.99 |
| bomb core body | bomb core body | object | midground | high | 0.98 |
| yellow and black diagonal stripes on bomb body | yellow and black diagonal stripes | object | midground | high | 0.98 |
| bomb fuse | bomb fuse | object | midground | high | 0.98 |
| spark on bomb fuse | spark | object | midground | medium | 0.95 |
| yellow sunburst explosion pattern on bomb body | yellow sunburst explosion pattern | object | midground | medium | 0.95 |
| black hexagonal panels around bomb body | black hexagonal panels | object | midground | medium | 0.95 |
| background with orange and blue glow | orange and blue glow background | environment | background | medium | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text ごうかいボム | card_ui_text | top left | visible | 0.9 |
| trainer type text トレーナーズ | card_ui_text | top right | visible | 0.9 |
| set and card number text jpn-m5 073/081 | card_ui_text | bottom left | visible | 0.95 |
| illustrator text illus. inose yukie | card_ui_text | bottom left | visible | 0.9 |
| japanese descriptive text block | card_ui_text | center below artwork | visible | 0.85 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_obj_001 | objects_and_props | main object is a bomb | obs_main_bomb_object_001 | 0.99 |
| fact_obj_002 | objects_and_props | bomb core body is visible | obs_bomb_core_body_001 | 0.98 |
| fact_obj_003 | objects_and_props | bomb body has yellow and black diagonal stripes | obs_bomb_decoration_stripe_001 | 0.98 |
| fact_obj_004 | objects_and_props | bomb has a fuse with spark lit | obs_bomb_fuse_001, obs_bomb_fuse_light_001 | 0.98 |
| fact_obj_005 | objects_and_props | bomb body depicts yellow sunburst explosion pattern | obs_bomb_sunburst_pattern_001 | 0.95 |
| fact_obj_006 | objects_and_props | bomb body has black hexagonal panels | obs_bomb_black_hexagon_panels_001 | 0.95 |
| fact_env_001 | environment | background behind bomb is an orange and blue glow | obs_background_orange_blue_glow_001 | 0.95 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_ui_001 | card name text is ごうかいボム | obs_card_ui_name_text_001 | 0.9 |
| fact_ui_002 | trainer type text is トレーナーズ | obs_card_ui_trainer_type_001 | 0.9 |
| fact_ui_003 | set and number text is jpn-m5 073/081 | obs_card_ui_set_and_number_001 | 0.95 |
| fact_ui_004 | illustrator text is illus. inose yukie | obs_card_ui_illus_text_001 | 0.9 |
| fact_ui_005 | japanese descriptive text block is visible below artwork | obs_card_ui_text_japanese_description_001 | 0.85 |

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
    "obs_card_ui_name_text_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_card_ui_set_and_number_001"
  ],
  "set_symbol_observation_ids": [],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [],
  "bottom_line_text_observation_ids": [
    "obs_card_ui_text_japanese_description_001"
  ],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_card_ui_illus_text_001"
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
| environment | likely_complete | low | high |  |
| composition | none_visible | none | not_applicable |  |
| color_and_light | none_visible | none | not_applicable |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | likely_complete | low | medium |  |
| counts | complete | none | high |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | likely_complete | low | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| none recorded | | | | | | |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| bomb | exact | 1 | obs_main_bomb_object_001 | 0.99 |

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
| bomb | obs_main_bomb_object_001 |
| yellow and black stripes | obs_bomb_decoration_stripe_001 |
| lit fuse | obs_bomb_fuse_001, obs_bomb_fuse_light_001 |
| spark | obs_bomb_fuse_light_001 |
| sunburst pattern | obs_bomb_sunburst_pattern_001 |
| orange blue glow background | obs_background_orange_blue_glow_001 |
| hexagonal panels | obs_bomb_black_hexagon_panels_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| diagonal composition | obs_bomb_decoration_stripe_001 | deterministic_rule | 0.98 |
| glowing highlights | obs_background_orange_blue_glow_001 | deterministic_rule | 0.95 |
| spark | obs_bomb_fuse_light_001 | deterministic_rule | 0.95 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: bomb, bomb core body, yellow and black diagonal stripes, bomb fuse, spark, yellow sunburst explosion pattern, black hexagonal panels, orange and blue glow background. Counts: bomb: 1.
- Quality flags: `none`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_main_bomb_object_001",
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
      "observation_id": "obs_bomb_core_body_001",
      "kind": "object",
      "label": "bomb core body",
      "normalized_label": "bomb core body",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bomb_decoration_stripe_001",
      "kind": "object",
      "label": "yellow and black diagonal stripes on bomb body",
      "normalized_label": "yellow and black diagonal stripes",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bomb_fuse_001",
      "kind": "object",
      "label": "bomb fuse",
      "normalized_label": "bomb fuse",
      "scene_layer": "midground",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bomb_fuse_light_001",
      "kind": "object",
      "label": "spark on bomb fuse",
      "normalized_label": "spark",
      "scene_layer": "midground",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bomb_sunburst_pattern_001",
      "kind": "object",
      "label": "yellow sunburst explosion pattern on bomb body",
      "normalized_label": "yellow sunburst explosion pattern",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bomb_black_hexagon_panels_001",
      "kind": "object",
      "label": "black hexagonal panels around bomb body",
      "normalized_label": "black hexagonal panels",
      "scene_layer": "midground",
      "frame_position": "around center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_background_orange_blue_glow_001",
      "kind": "environment",
      "label": "background with orange and blue glow",
      "normalized_label": "orange and blue glow background",
      "scene_layer": "background",
      "frame_position": "around bomb",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_text_001",
      "kind": "card_ui_text",
      "label": "card name text ごうかいボム",
      "normalized_label": "ごうかいボム",
      "scene_layer": "ui",
      "frame_position": "top left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_card_ui_trainer_type_001",
      "kind": "card_ui_text",
      "label": "trainer type text トレーナーズ",
      "normalized_label": "トレーナーズ",
      "scene_layer": "ui",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_card_ui_set_and_number_001",
      "kind": "card_ui_text",
      "label": "set and card number text jpn-m5 073/081",
      "normalized_label": "jpn-m5 073/081",
      "scene_layer": "ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_illus_text_001",
      "kind": "card_ui_text",
      "label": "illustrator text illus. inose yukie",
      "normalized_label": "illus. inose yukie",
      "scene_layer": "ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_card_ui_text_japanese_description_001",
      "kind": "card_ui_text",
      "label": "japanese descriptive text block",
      "normalized_label": "japanese descriptive text",
      "scene_layer": "ui",
      "frame_position": "center below artwork",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.85,
      "evidence_strength": "medium"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_obj_001",
      "module": "objects_and_props",
      "field_path": "[0]",
      "claim": "main object is a bomb",
      "value": "bomb",
      "supporting_observation_ids": [
        "obs_main_bomb_object_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_002",
      "module": "objects_and_props",
      "field_path": "[0].body",
      "claim": "bomb core body is visible",
      "value": "round black bomb core body",
      "supporting_observation_ids": [
        "obs_bomb_core_body_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_003",
      "module": "objects_and_props",
      "field_path": "[0].decoration_stripes",
      "claim": "bomb body has yellow and black diagonal stripes",
      "value": "yellow and black diagonal stripes on bomb body",
      "supporting_observation_ids": [
        "obs_bomb_decoration_stripe_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_004",
      "module": "objects_and_props",
      "field_path": "[0].fuse",
      "claim": "bomb has a fuse with spark lit",
      "value": "bomb fuse with bright spark on fuse tip",
      "supporting_observation_ids": [
        "obs_bomb_fuse_001",
        "obs_bomb_fuse_light_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_005",
      "module": "objects_and_props",
      "field_path": "[0].pattern",
      "claim": "bomb body depicts yellow sunburst explosion pattern",
      "value": "yellow sunburst pattern on bomb body",
      "supporting_observation_ids": [
        "obs_bomb_sunburst_pattern_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_006",
      "module": "objects_and_props",
      "field_path": "[0].panels",
      "claim": "bomb body has black hexagonal panels",
      "value": "black hexagonal panels around bomb body",
      "supporting_observation_ids": [
        "obs_bomb_black_hexagon_panels_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_001",
      "module": "environment",
      "field_path": "background",
      "claim": "background behind bomb is an orange and blue glow",
      "value": "orange and blue glow background",
      "supporting_observation_ids": [
        "obs_background_orange_blue_glow_001"
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
        "obs_card_ui_name_text_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_ui_002",
      "module": "card_ui_and_print_markers",
      "field_path": "trainer_type_text",
      "claim": "trainer type text is トレーナーズ",
      "value": "トレーナーズ",
      "supporting_observation_ids": [
        "obs_card_ui_trainer_type_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_ui_003",
      "module": "card_ui_and_print_markers",
      "field_path": "set_and_number_text",
      "claim": "set and number text is jpn-m5 073/081",
      "value": "jpn-m5 073/081",
      "supporting_observation_ids": [
        "obs_card_ui_set_and_number_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_004",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator text is illus. inose yukie",
      "value": "illus. inose yukie",
      "supporting_observation_ids": [
        "obs_card_ui_illus_text_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_ui_005",
      "module": "card_ui_and_print_markers",
      "field_path": "japanese_description_text",
      "claim": "japanese descriptive text block is visible below artwork",
      "value": "japanese descriptive text",
      "supporting_observation_ids": [
        "obs_card_ui_text_japanese_description_001"
      ],
      "confidence": 0.85,
      "evidence_strength": "medium"
    }
  ],
  "subjects": [],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [
    {
      "count_id": "cnt_bomb_001",
      "normalized_label": "bomb",
      "count_type": "exact",
      "exact_count": 1,
      "estimated_min": 1,
      "estimated_max": 1,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_main_bomb_object_001"
      ],
      "scene_layer": "midground",
      "confidence": 0.99
    }
  ],
  "scene_layers": {
    "foreground": [],
    "midground": [
      "obs_bomb_black_hexagon_panels_001",
      "obs_bomb_core_body_001",
      "obs_bomb_decoration_stripe_001",
      "obs_bomb_fuse_001",
      "obs_bomb_fuse_light_001",
      "obs_bomb_sunburst_pattern_001",
      "obs_main_bomb_object_001"
    ],
    "background": [
      "obs_background_orange_blue_glow_001"
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
      "obs_background_orange_blue_glow_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_main_bomb_object_001",
      "label": "bomb",
      "normalized_label": "bomb",
      "object_type": "device",
      "colors": [
        "black",
        "orange",
        "red",
        "white",
        "yellow"
      ],
      "material_appearance": [
        "bright spark",
        "dark rounded body",
        "glossy surface"
      ],
      "location": "center",
      "count_reference": "cnt_bomb_001",
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
      "bright spark lighting on fuse"
    ],
    "shadows": [
      "soft shadows on bomb body"
    ],
    "highlights": [
      "glossy highlight on bomb body"
    ],
    "composition": [
      "central composition of bomb"
    ],
    "camera_angle": "frontal with slight top angle",
    "framing": "tight framing on bomb object",
    "cropping": [],
    "depth": "moderate depth with background glow",
    "motion_cues": [
      "spark motion implied"
    ],
    "motifs": [
      "explosion sunburst motif"
    ],
    "repeated_shapes": [
      "hexagonal panels"
    ],
    "style_cues": [
      "cartoon style",
      "clean lines"
    ],
    "supporting_observation_ids": [
      "obs_background_orange_blue_glow_001",
      "obs_bomb_black_hexagon_panels_001",
      "obs_bomb_fuse_light_001",
      "obs_bomb_sunburst_pattern_001",
      "obs_main_bomb_object_001"
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
        "fact_obj_005",
        "fact_obj_006"
      ],
      "object_observation_ids": [
        "obs_main_bomb_object_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_env_001"
      ],
      "observation_ids": [
        "obs_background_orange_blue_glow_001"
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
        "fact_ui_001",
        "fact_ui_002",
        "fact_ui_003",
        "fact_ui_004",
        "fact_ui_005"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_name_text_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_card_ui_set_and_number_001"
      ],
      "set_symbol_observation_ids": [],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [],
      "bottom_line_text_observation_ids": [
        "obs_card_ui_text_japanese_description_001"
      ],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_card_ui_illus_text_001"
      ],
      "error_marker_observation_ids": [],
      "other_print_marker_observation_ids": []
    },
    "counts": {
      "fact_ids": [],
      "count_ids": [
        "cnt_bomb_001"
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
        "yellow and black stripes",
        "lit fuse",
        "spark",
        "sunburst pattern",
        "orange blue glow background",
        "hexagonal panels"
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
      "review_status": "likely_complete",
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
      "review_status": "likely_complete",
      "omission_risk": "low",
      "evidence_quality": "medium",
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
      "term": "bomb",
      "supporting_observation_ids": [
        "obs_main_bomb_object_001"
      ]
    },
    {
      "term": "yellow and black stripes",
      "supporting_observation_ids": [
        "obs_bomb_decoration_stripe_001"
      ]
    },
    {
      "term": "lit fuse",
      "supporting_observation_ids": [
        "obs_bomb_fuse_001",
        "obs_bomb_fuse_light_001"
      ]
    },
    {
      "term": "spark",
      "supporting_observation_ids": [
        "obs_bomb_fuse_light_001"
      ]
    },
    {
      "term": "sunburst pattern",
      "supporting_observation_ids": [
        "obs_bomb_sunburst_pattern_001"
      ]
    },
    {
      "term": "orange blue glow background",
      "supporting_observation_ids": [
        "obs_background_orange_blue_glow_001"
      ]
    },
    {
      "term": "hexagonal panels",
      "supporting_observation_ids": [
        "obs_bomb_black_hexagon_panels_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "diagonal composition",
        "source_observation_ids": [
          "obs_bomb_decoration_stripe_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "glowing highlights",
        "source_observation_ids": [
          "obs_background_orange_blue_glow_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "spark",
        "source_observation_ids": [
          "obs_bomb_fuse_light_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      }
    ]
  }
}
```

</details>

## Validation Failures

- GV-PK-JPN-M5-118: fact_graph_semantic_fact_label_not_supported_v1:semfact_001
- GV-PK-JPN-M5-112: fact_graph_semantic_fact_label_not_supported_v1:sem_001
- GV-PK-JPN-M5-096: fact_graph_semantic_fact_label_not_supported_v1:semfact_001
- GV-PK-JPN-M5-099: fact_graph_semantic_fact_evidence_contradiction:semfact_002:forest_without_tree_evidence
- GV-PK-JPN-M5-063: fact_graph_uncertainty_observation_missing:obs_hp_text_001
- GV-PK-JPN-M5-108: fact_graph_semantic_fact_label_not_supported_v1:semfact_002
- GV-PK-JPN-M5-109: fact_graph_semantic_fact_label_not_supported_v1:semfact_pose_001
- GV-PK-JPN-M5-117: fact_graph_semantic_fact_label_not_supported_v1:sem_fact_001
- GV-PK-JPN-M5-111: fact_graph_semantic_fact_label_not_supported_v1:svf_001, fact_graph_semantic_fact_label_not_supported_v1:svf_003
- GV-PK-JPN-M5-075: fact_graph_semantic_fact_label_not_supported_v1:sem_fact_002, fact_graph_semantic_fact_label_not_supported_v1:sem_fact_004, fact_graph_semantic_fact_label_not_supported_v1:sem_fact_006, fact_graph_semantic_fact_label_not_supported_v1:sem_fact_007
- GV-PK-JPN-TCGCOLLECTOR11526-019: fact_graph_semantic_fact_label_not_supported_v1:sem_fact_002, fact_graph_semantic_fact_label_not_supported_v1:sem_fact_003

