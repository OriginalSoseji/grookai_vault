# Card Visual Search TCG Concept Profile V1

Status: Active

Date: 2026-07-30

## Purpose

This contract converts variable but accepted Fact Graph evidence into stable,
collector-facing TCG concepts without rerunning Vision or changing raw facts.

The three layers remain:

```text
raw observation
-> accepted projected evidence
-> deterministic TCG visual concept
```

## Authority

A TCG concept is derived intelligence. It must:

- cite one or more existing observation IDs;
- identify the accepted source entries used by the rule;
- use `derivation: deterministic_rule`;
- preserve the original observation and typed-fact wording;
- remain removable and rebuildable in a later release.

A concept cannot recover a visual detail that the paid extraction omitted. An
omission may be filled only by separately governed human-confirmed or permitted
external evidence.

## Concept Families

The initial profile normalizes common collector dimensions:

- pose and action;
- environment and weather;
- objects, food, and TCG props such as Poke Balls;
- flames, smoke, lightning, sparks, vapor, and glow;
- composition and lighting;
- depicted subjects and character-shaped objects;
- visible-subject quantity diagnostics;
- evidence-backed Halloween visual themes.

The vocabulary is TCG-centric but not franchise metadata. Canonical card names,
attacks, mechanics, rarity, set names, and card UI cannot become artwork
concepts.

## Evidence Thresholds

Direct concepts such as `sleeping`, `forest`, `cookie`, `Poke Ball`, or
`lightning` require a source phrase that visibly supports that concept.

Composite concepts require multiple independent cue families unless the source
already states the concept. For example, `Halloween visual theme` requires an
explicit visible Halloween label or at least two cue families such as pumpkins,
tombstones, bats, candles, webs, or ghost effects.

One dark background or one Ghost-type subject does not prove a Halloween
theme.

## Appearance Roles

These remain separate:

- `scene_subject`
- `depicted_subject`
- `character_representation`
- `curated_association_unresolved`
- `visual_resemblance_reference`

`character-shaped food` requires character-representation evidence. A cookie
and a character somewhere else in the artwork cannot be combined into that
relationship.

## Current Corpus Boundary

The existing 10,000-plus paid Fact Graphs are not modified. This profile runs
only during deterministic projection.

No OpenAI call, embedding, database write, approval, or canonical mutation is
authorized by this contract.

## Future Extraction

Future Fact Graph prompts should inspect for the same collector dimensions
natively, including:

- all independently visible characters;
- characters depicted on surfaces;
- character-shaped objects and food;
- TCG props and relationships;
- exact or bounded visible counts;
- pose, action, clothing, anatomy, environment, effects, composition, and
  lighting;
- explicit omission and uncertainty.

Future extraction still records objective observations first. It does not write
search concepts as unsupported image facts.
