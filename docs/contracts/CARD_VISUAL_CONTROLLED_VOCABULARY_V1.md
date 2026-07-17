# CARD_VISUAL_CONTROLLED_VOCABULARY_V1

Status: Active

Date: 2026-07-17

## Purpose

`CARD_VISUAL_CONTROLLED_VOCABULARY_V1` governs deterministic vocabulary normalization and canonical visual concept derivation for Card Visual Fact Graph V2.

It does not change the extraction ontology. It makes otherwise valid facts more searchable and consistent without discarding the model's raw visible-evidence wording.

## Three Layers

Grookai keeps three layers separate:

1. Raw observation label: the model's original visible-evidence phrase.
2. Normalized vocabulary term: deterministic cleanup for stable fields such as pose, orientation, object labels, environment terms, and search terms.
3. Canonical visual concept: a derived, versioned concept created by deterministic rules from existing observations and typed facts.

Raw labels are preserved for audit. Search and downstream consumers should prefer normalized terms and canonical concepts.

## Non-Destructive Rule

Normalization must not introduce new observations, subjects, counts, or typed facts.

Allowed:

- collapse spelling or formatting variance
- remove standalone franchise-label residue from artwork search terms
- normalize common pose and orientation phrasing
- convert actual-material wording to appearance-only wording
- derive canonical concepts from observation-backed evidence

Not allowed:

- invent visible content
- infer lore, story, personality, or intent
- treat canonical identity as visual evidence
- rewrite raw observation labels
- upgrade review status solely because a raw label was preserved

## Pose And Orientation

Common pose language should normalize to controlled terms such as:

- `standing`
- `sitting`
- `sleeping`
- `lying down`
- `leaping`
- `floating`
- `flying`
- `running`
- `walking`
- `crouching`
- `kneeling`
- `reaching`
- `holding`

Orientation should normalize to terms such as:

- `forward`
- `left`
- `right`
- `upward`
- `downward`
- `forward-left`
- `forward-right`
- `upward-left`
- `upward-right`
- `downward-left`
- `downward-right`

If unusual visible pose details are present, they remain as free-text details in the appropriate module rather than being forced into a small enum.

## Search Terms

Artwork search terms must be visual concepts, not canonical metadata.

Remove or avoid:

- exact card names
- exact subject identities when identity is already stored in canonical subject fields
- standalone franchise labels such as `Pokemon` or `Pokémon`
- rarity, attacks, mechanics, set names, collector numbers, HP, and other card UI text
- physical print treatment terms such as `gold foil`, `foil`, `holographic`, `embossed`, `print finish`, or `printing treatment`
- card UI and mechanics terms such as `energy symbol`, `type symbol`, `weakness`, `resistance`, and `retreat cost`

Keep when supported:

- `purple flames`
- `forest background`
- `yellow stripe band`
- `spark at fuse tip`
- `low-cut neckline`
- `exposed shoulders`
- `aurora-like light bands`
- `radial lines`
- `sleeping Pokemon` when supported by a sleeping semantic fact and a visible Pokemon subject
- `happy Pikachu` when supported by a happy semantic fact and a visible Pikachu subject

Compound subject-plus-state terms may preserve the franchise or identity word when each component is supported by the fact graph. Normalization should not collapse `sleeping Pokemon` into `sleeping` because the subject class is useful for search. Exact standalone identities and standalone franchise labels remain filtered from generic artwork search terms.

When an exact subject identity is already stored in a subject, depicted subject, or character representation field, redundant identity wording is removed from otherwise useful generic visual search phrases. For example, `floating Mega Darkrai` normalizes to `floating`, while `sleeping Pokemon` remains valid because `Pokemon` is a subject class rather than an exact identity.

Use `water body` instead of `water scene` for generic water evidence. Scene/story wording is avoided unless it names a directly visible setting category such as `forest background` or `food scene`.

Evidence-only face details such as `open eyes`, `closed eyes`, `neutral eyebrows`, `face visible`, or `eyes not clearly visible` are preserved in raw observations and facial-evidence fields, but are not canonical semantic facts by themselves. They can support a higher-level semantic fact such as `smiling`, `sleeping`, or `surprised`.

## Canonical Visual Concepts

Canonical concepts are derived under:

```json
{
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "lightning",
        "source_observation_ids": ["obs_lightning_001"],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      }
    ]
  }
}
```

Every concept must cite existing observation IDs. Concepts are replaceable derived intelligence, not raw facts.

Concepts are deduplicated by canonical concept name. If the same concept is derived from multiple supported facts, its source observation IDs are unioned under one concept entry instead of creating duplicate concept rows.

Concept support should be as specific as practical. A visual-design claim such as `curved building` should derive a `building` concept supported by the building observation, not by every observation listed in the broader `visual_design.supporting_observation_ids` array. Broad module support is not enough to attach unrelated observations to a concept.

## Initial Concept Families

V1 derives common concepts for:

- pose and orientation
- lightning, flame, smoke, spark, glow
- radial, circular, spiral, diagonal, centered, and close-crop composition
- forest, trees, buildings, sky, clouds, terrain, water, rain, snow, flowers
- clothing and body-region facts such as hats, gloves, capes, masks, armor, long hair, exposed shoulders, exposed midriff, low-cut neckline, and sleeveless clothing
- material appearance concepts such as metal-like, glass-like, and reflective-looking surfaces

## Audit Requirements

Vocabulary changes must be reviewed with a before/after drift report showing:

- raw terms preserved
- normalized terms produced
- canonical concepts derived
- synonym reductions
- meaningful distinctions that were not collapsed
- validation counts before and after
- review-status changes, if any

The acceptable gate is:

- no lost observation references
- no new raw facts introduced
- no review-status upgrade caused only by normalization
- reduced term variance for equivalent concepts
- preserved raw observation labels
