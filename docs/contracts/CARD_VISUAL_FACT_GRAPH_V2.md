# CARD_VISUAL_FACT_GRAPH_V2

Status: Active

Date: 2026-07-17

## Purpose

`CARD_VISUAL_FACT_GRAPH_V2` governs Grookai's modular exhaustive ontology for directly observable TCG artwork facts.

The source of truth is `visual_attributes.fact_graph`. The required `artwork_description` field is compatibility-only and must be derived mechanically from the graph. It is not an AI-authored story, caption, review, or taste narrative.

## Core Rule

If visible, record it. If partially visible, qualify it. If uncertain, explain why. If unsupported, abstain.

No fixed observation quota defines success. A simple Energy card may be complete with fewer facts. A dense Trainer, Stadium, or full-art card may remain incomplete with many facts if a careful review finds meaningful visible omissions.

## Required Shape

The graph must preserve `observations` as the raw evidence backbone.

V2 adds:

- `typed_facts`: traceable claims with `fact_id`, `module`, `field_path`, `claim`, `value`, `supporting_observation_ids`, `confidence`, and `evidence_strength`.
- `modules`: structured facts for subjects, human appearance, creature anatomy, clothing, objects and props, environment, composition, color and light, visual effects, card UI and print markers, counts, relationships, surface and scan cues, uncertainty, and search terms.
- `module_reviews`: one completeness review per required module.

Every meaningful typed fact must cite valid observation IDs.

## Card UI And Print Markers

Visible printed card interface evidence is preserved because it can distinguish exact printings, corrected/error cards, promo releases, copyright-line differences, stamp differences, logo differences, and other subtle identity markers.

The governing distinction is:

- Canonical database: authoritative expected identity and metadata.
- Visible card UI / print markers: image-derived evidence that may support, refine, or conflict with canonical identity.
- Artwork fact graph: observable visual content inside the illustrated artwork.

`card_ui_and_print_markers` is the required module for printed information outside the illustrated artwork area, including:

- card name text
- HP text
- collector number
- set symbol
- rarity mark
- copyright line
- bottom legal text
- illustrator text
- promo stamps
- WB Kids logos or wording
- other logos
- energy/type symbols
- regulation marks
- edition markers
- visible error or correction markers
- language-specific print text

These facts must use card UI observation kinds such as `card_ui_text`, `card_ui_symbol`, `print_marker`, `promo_stamp`, `copyright_text`, `collector_number`, `rarity_mark`, `set_symbol`, `regulation_mark`, `illustrator_text`, `bottom_line_text`, `logo`, `error_marker`, `card_name_text`, or `hp_text`.

Card UI facts must not be stored under `human_appearance`, `creature_anatomy`, `clothing`, `objects_and_props`, `environment`, `composition`, `color_and_light`, or `visual_effects`.

Visible text inside the illustrated scene, such as a street sign, book, poster, screen, or in-scene logo, remains artwork-scene evidence and is not automatically card UI.

Card UI text must not be copied from canonical metadata unless it is visibly supported by the image. If small text cannot be read reliably, the graph must abstain explicitly rather than invent OCR text.

General artwork search terms must not automatically include OCR text, card names, HP values, collector numbers, copyright lines, promo marks, stamps, or logos. Those stay in `card_ui_and_print_markers` until a future identity-resolution or search layer intentionally exposes them.

## Module Reviews

Each module must include a completeness review:

- `module`
- `review_status`
- `omission_risk`
- `evidence_quality`
- field-specific `abstentions`

Empty modules are valid only with explicit status such as `none_visible`, `not_applicable`, `cannot_determine_due_to_low_resolution`, `cannot_determine_due_to_crop`, `cannot_determine_due_to_glare`, or `uncertain`.

## Human Appearance

Human and humanoid subjects use factual appearance fields:

- `visible_body_regions`
- hair
- face and facial evidence
- clothing garments
- neckline
- sleeves
- headwear
- footwear
- armor
- capes
- masks
- accessories
- visible tattoos
- gestures

Subjective body, attractiveness, personality, or expression labels are prohibited. Store visible evidence, not interpretation.

## Creature Anatomy

Creature and Pokemon subjects use factual anatomy fields:

- body regions
- head and face location
- eyes, mouth, and facial evidence
- limbs
- appendages
- wings
- tails
- horns
- claws
- markings
- flames and effects
- posture
- orientation

Pokemon body components remain anatomy, not props. Do not store interpreted expressions such as angry, happy, fierce, confident, majestic, or sexy.

## Object And Material Claims

Object fields may describe material appearance only.

Allowed:

- `metallic-looking highlights`
- `glass-like shine`
- `bright reflective-looking edge`

Not allowed as fact:

- `made of metal`
- `glossy card finish`
- `physical foil texture visible`

Physical card-surface claims require reliable visual evidence. Otherwise they must be explicit abstentions.

## Subject-Kind Separation

These concepts must remain rigidly separate:

- `scene_subject`: a living/entity subject physically present in the illustrated scene.
- `depicted_subject`: a character/entity shown inside another visible surface such as a poster, photo, screen, card, painting, sign, or book.
- `character_representation`: an object shaped like, patterned after, or visually representing a character, such as a plush, pillow, statue, toy, ice cream shape, logo, sticker, or pattern.

## Counts

Counts must cite what was counted.

Exact counts are preferred when practical. Dense repeated elements may use estimated ranges or abstentions when countability is limited by crop, glare, overlap, scale, or resolution.

## Search Terms

Fact-grounded search terms must cite observation-backed facts.

They must not contain unsupported lore, story, attacks, rarity, mechanics, set names, franchise labels, or canonical metadata that is not visually present.

## Boundaries

V2 does not authorize:

- migrations
- database writes
- approvals
- embeddings
- semantic search
- Taste Engine integration
- Listing Resolver integration
- generated story output
- production apply

The first V2 gate is a 5-card OpenAI dry run only: dense Pokemon artwork, Trainer/person artwork, environment-heavy Stadium, abstract Energy, and object-heavy Item.
