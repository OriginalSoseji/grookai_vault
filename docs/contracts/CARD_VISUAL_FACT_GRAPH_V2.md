# CARD_VISUAL_FACT_GRAPH_V2

Status: Active

Date: 2026-07-18

## Purpose

`CARD_VISUAL_FACT_GRAPH_V2` governs Grookai's modular exhaustive ontology for directly observable TCG artwork facts.

The source of truth is `visual_attributes.fact_graph`. The required `artwork_description` field is compatibility-only and must be derived mechanically from the graph. It is not an AI-authored story, caption, review, or taste narrative.

## Core Rule

If visible, record it. If partially visible, qualify it. If uncertain, explain why. If unsupported, abstain.

No fixed observation quota defines success. A sparse card may be complete with fewer facts. A dense Trainer, Stadium, or full-art card may remain incomplete with many facts if a careful review finds meaningful visible omissions.

## Required Shape

The graph must preserve `observations` as the raw evidence backbone.

V2 adds:

- `typed_facts`: traceable claims with `fact_id`, `module`, `field_path`, `claim`, `value`, `supporting_observation_ids`, `confidence`, and `evidence_strength`.
- `modules`: structured facts for subjects, human appearance, creature anatomy, clothing, objects and props, environment, composition, color and light, visual effects, card UI and print markers, counts, relationships, surface and scan cues, uncertainty, and search terms.
- `module_reviews`: one completeness review per required module.
- `semantic_visual_facts`: reusable meaning-level visual facts such as `happy`, `sleeping`, `forest`, `rainy`, `floating`, `eating`, `fighting`, `cameo`, `Pikachu pillow`, or `ten trees`, only when supported by observation IDs and explicit visual evidence.
- `canonical_visual_concepts`: deterministic, versioned concepts derived from observation-backed facts under `CARD_VISUAL_CONTROLLED_VOCABULARY_V1`.

Every meaningful typed fact must cite valid observation IDs.

## Controlled Vocabulary

V2 separates language into three layers:

- raw observation label
- normalized vocabulary term
- canonical visual concept

The raw observation label is preserved for audit. Normalized terms and canonical concepts are deterministic post-processing layers used for stable search and downstream systems. They must not introduce new observations, subjects, counts, typed facts, lore, story, personality, or unsupported visual claims.

The governing vocabulary contract is `docs/contracts/CARD_VISUAL_CONTROLLED_VOCABULARY_V1.md`.

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

Subjective body, attractiveness, and personality labels are prohibited. Facial evidence belongs here as visible evidence such as `smiling mouth`, `closed eyes`, `open mouth`, or `angled eyebrows`. Reusable expression/state labels such as `happy` or `sleeping` are allowed only in `semantic_visual_facts` with supporting observations and evidence.

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

Pokemon body components remain anatomy, not props. Do not store unsupported expression, personality, or body-value judgments in anatomy fields. Store visible evidence here, then store supported reusable labels such as `happy`, `sleeping`, or `angry` only in `semantic_visual_facts`.

## Semantic Visual Facts

`semantic_visual_facts` turns observable evidence into reusable meaning-level visual facts without creating story.

Each entry must include:

- `semantic_fact_id`
- `category`
- `label`
- `subject_observation_id` when subject-specific
- `supporting_observation_ids`
- `evidence`
- `confidence`
- `uncertainty`

Allowed examples:

- `happy` supported by smiling mouth, relaxed eyes, or raised arms
- `sleeping` supported by closed eyes and lying-down body position
- `sharp teeth`, `visible fangs`, or `jagged mouth shape` supported by visible mouth/teeth evidence
- `snarling` supported by visible open mouth plus teeth/fang evidence, with no closed-mouth contradiction
- `forest` supported by visible trees, trunks, foliage, or wooded terrain
- `rainy` supported by visible rain streaks, raindrops, wet ground, or puddles
- `floating` supported by a subject suspended above visible ground or by pose evidence
- `stadium environment` supported by visible field, stands, path, structures, or signage
- `coniferous trees`, `traffic cones`, `reflective water`, or `blue sky with clouds` when supported by the corresponding visible environment/object observations
- `Pikachu pillow` supported by a character-representation record and host object
- `Pikachu cameo` supported by a depicted-subject or character-representation record
- `red eyes`, `half-closed eyes`, `drooping eyelids`, `smoke`, `vapor`, `haze`, `smoke near mouth`, or `pipe-like object` as concrete visible cues

Not allowed:

- `protecting a friend`
- `lost in the forest`
- `symbolizing hope`
- `brave`
- `evil`
- `majestic`
- `confident`
- `sexy`
- `stoner`
- `high`
- `under the influence`
- `intoxicated`
- `drugged`
- `stoned`

Evidence-only details are not standalone semantic facts when they are merely generic visibility notes. Labels such as `open eyes`, `closed eyes`, `neutral eyebrows`, `face visible`, or `eyes not clearly visible` belong in `facial_evidence` or inside a semantic fact's `evidence` object. Distinct objective search concepts such as `sharp teeth`, `visible fangs`, or `jagged mouth shape` may be semantic facts when they cite matching observations. Interpreted expression labels such as `happy`, `angry`, `annoyed`, or `snarling` require objective facial support and must not be supported only by circular wording.

The semantic label must not contradict the evidence. `happy` cannot be supported only by a frown or a hidden face. `sleeping` cannot be supported by open eyes and running.

## Substance-Cue Alias Boundary

Colloquial searches such as `stoner`, `high`, `under the influence`, or `smoked out` are supported only as future search aliases. They are not factual labels about a subject.

The fact graph may record only directly visible cue evidence:

- eye cues such as `red eyes`, `bloodshot-looking eyes`, `half-closed eyes`, or `drooping eyelids`
- atmospheric cues such as `smoke`, `smoke cloud`, `smoke plume`, `vapor`, or `haze`
- object cues such as `pipe-like object`, `pipe-shaped object`, `cigarette-like object`, `cigar-like object`, or `smoking object`
- positional cues such as `smoke near mouth` or `vapor near mouth`

The derived concept `altered-state visual cue evidence` is search-facing derived intelligence. It may be created only from multiple supported cue families, such as smoke plus red-eye/eyelid cues, or from an explicit visible smoking/paraphernalia-like object cue. It must cite the underlying observation IDs and must not assert that a subject is actually intoxicated, drugged, high, or under the influence.

Raw observation labels may preserve literal visible text when the artwork contains it, but `stoner`, `high`, `under the influence`, `intoxicated`, `drugged`, and `stoned` must not be stored as accepted semantic facts or artwork search terms.

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

Search terms are judged by usefulness, not count. Do not pad redundant, generic, nonvisual, or weak terms to satisfy a quota; one or two strong grounded terms are preferable to three padded terms.

When the model records observations but omits the top-level search-term array, the agent may deterministically derive search terms from high- and medium-salience artwork observations. Derived search terms must still cite observation IDs and must exclude card UI / print-marker observations.

Search terms supported only by card UI / print-marker observations are removed from the artwork search-term layer. Actual-material terms in object fields are normalized to appearance-only language, such as `metal-like appearance`, `wood-like appearance`, or `stone-like appearance`.

Artwork search terms must also exclude physical print treatment and card UI/mechanics concepts even when the model misclassifies their supporting observation. Examples to remove or reject include `gold foil`, `foil`, `HP`, `attack text`, `weakness`, `resistance`, `retreat cost`, `collector number`, `rarity`, `set symbol`, `copyright`, `illustrator text`, `energy symbol`, and `type symbol`.

Compound search terms such as `happy Pikachu`, `sleeping Pokemon`, `Pikachu pillow`, `forest background`, or `ten trees` are valid only when every component is backed by subjects, `semantic_visual_facts`, counts, depicted subjects, character representations, or other observation-backed graph facts. Standalone generic franchise labels remain non-useful search terms.

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

Energy cards are deferred from active visual fact extraction. Historical Energy calibration artifacts may remain for audit context, and the Energy prompt branch may remain available for a future deliberate re-enable, but current candidate selection, branch-stratified runs, stress runs, and production extraction must exclude Energy cards.

The current V2 stress gate uses active non-Energy roles only: dense Pokemon artwork, Trainer/person artwork, environment-heavy Stadium, and object-heavy Item.
