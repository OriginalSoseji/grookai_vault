# CARD_VISUAL_FACT_GRAPH_V1

Status: Active

Date: 2026-07-17

## Purpose

Grookai's card visual intelligence must extract reusable visible facts, not write prose.

The source of truth for this build is `visual_attributes.fact_graph` on private `card_print_visual_descriptions` rows. The graph is derived intelligence anchored to a canonical `card_print_id` and image hash. It is not canonical identity truth, image truth, pricing truth, or app-facing public truth.

## Core Rule

The agent must capture all useful directly observable facts on the card image, including subjects, objects, counts, environment, composition, lighting, palette, motifs, relationships, uncertainty, and reliable surface or scan cues.

`artwork_description` is compatibility-only. It must be generated deterministically from the fact graph and must never be model-authored narrative.

## Required Fact Graph

The active schema version is `CARD_VISUAL_FACT_GRAPH_SCHEMA_V1`.

The graph must be stored under:

```json
{
  "visual_attributes": {
    "fact_schema_version": "CARD_VISUAL_FACT_GRAPH_SCHEMA_V1",
    "fact_graph": {}
  }
}
```

The graph must include:

- `observations`: atomic visible facts with stable `observation_id`s.
- `subjects`: physically present living/entity subjects in the illustrated scene.
- `depicted_subjects`: characters or entities shown inside another surface, such as a poster, photo, sign, screen, card, painting, or book.
- `character_representations`: objects whose appearance represents a character, such as plushes, pillows, statues, toys, logos, food shapes, stickers, or patterns.
- `counts`: exact counts, estimated ranges, or abstentions that reference supporting observations.
- `scene_layers`: foreground, midground, and background observation references.
- `environment`: setting, sky, ground, terrain, plants, architecture, water, weather, and time-of-day cues only when visibly supported.
- `objects_and_props`: visible tools, furniture, food, signs, vehicles, books, rocks, flowers, trees, buildings, flames, smoke, reflections, symbols, decorations, and effects.
- `relationships`: observation-to-observation relationships such as holding, standing on, sleeping in, printed on, shaped like, behind, beside, overlapping, or surrounded by.
- `visual_design`: palette, lighting, shadows, highlights, composition, camera angle, framing, cropping, depth, motion cues, motifs, repeated shapes, and visible style cues.
- `surface_and_scan_cues`: reliable border, glare, crop, foil, texture, print finish, or scan-quality observations only.
- `coverage_reviews`: explicit proof that every major category was considered.
- `uncertainty_and_abstentions`: identity, count, setting, facial evidence, surface, visibility, and subject-kind uncertainty.
- `fact_grounded_search_terms`: search terms that cite supporting observations.

## Traceability Invariants

- Every subject, depicted subject, and character representation must reference an `observation_id`.
- Every count must reference the observation or observations counted.
- Every relationship must reference valid source and target observation IDs.
- Every search term must cite at least one supporting observation ID.
- Empty major sections are valid only with an explicit coverage review status.

Valid coverage review statuses:

- `observed`
- `none_visible`
- `not_applicable`
- `cannot_determine_due_to_low_resolution`
- `cannot_determine_due_to_crop`
- `cannot_determine_due_to_glare`
- `uncertain`

## Subject-Kind Boundary

The graph must never collapse these concepts:

- `scene_subject`: a character, person, Pokemon, creature, or living entity physically present in the illustrated scene.
- `depicted_subject`: a character or entity shown inside another visual surface.
- `character_representation`: an object shaped like or patterned after a character.

Example: Pikachu standing in a forest is a `scene_subject`. Pikachu on a poster or card is a `depicted_subject`. A Pikachu pillow, plush, logo, statue, or ice cream shape is a `character_representation`.

## Expression Rule

V1 must not store interpreted expression labels as facts.

Allowed:

- eyes visible
- mouth open
- eyebrows angled downward
- face position visible

Not allowed:

- angry
- happy
- confident
- sad
- friendly
- determined
- focused

## Count Rule

Repeated visible elements must be counted whenever practical.

Use:

- exact count when clearly countable
- estimated range when dense or partially obscured
- abstention when crop, glare, low resolution, or density prevents reliable counting

Example: if a forest has 10 visible trees, record a `tree` count of `10` and cite the tree observation.

## Story Firewall

The graph must contain facts that could support a future story, but it must not contain story.

Allowed:

- `Pikachu`
- `standing`
- `dark forest`
- `10 trees`

Not allowed:

- `Pikachu is lost in the forest`
- `the scene symbolizes loneliness`
- `the character is protecting the forest`

## Downstream Boundary

This contract prepares data for future semantic search, Taste Engine, Grookai Signature, cameo detection, visual matching, generated visuals, and optional story generation. It does not implement or activate any of those systems.
