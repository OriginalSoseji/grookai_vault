# CARD_VISUAL_SEARCH_CONTRACT_V1

Status: Active - implementation and public activation require separate gates

Date: 2026-07-21

## Purpose

This contract defines how Grookai will let collectors search for cards by directly visible artwork facts while preserving canonical identity, evidence traceability, subject roles, printing boundaries, and deterministic normal-search behavior.

The product question is:

> Can collectors reliably find cards by what is visibly depicted in the artwork?

This contract defines behavior only. It does not authorize a migration, corpus apply, embedding job, API release, or public UI.

## Relationship To Existing Search

Visual search extends the existing search system; it does not replace it.

- `SEARCH_CONTRACT_V1` remains authoritative for deterministic canonical name, set, and number search.
- `GROOKAI_SMART_SEARCH_V1` remains authoritative for compiling natural language into trusted canonical filters without an AI model on the normal search path.
- `CAMEO_SEARCH_V1` remains authoritative for externally sourced cameo mappings.
- Image-derived scene subjects, depicted subjects, and character representations remain Fact Graph evidence and must not overwrite external cameo metadata or canonical identity.

Normal search execution must not call a generative model or generate arbitrary SQL.

## Core Principles

- Search visible facts, not generated stories.
- Preserve raw evidence and normalized concepts separately.
- Keep canonical metadata separate from image-derived visual claims.
- Group by artwork before expanding to printings.
- Explain every visual match with evidence.
- Prefer no result over unsupported inference.
- Treat search eligibility and human approval as separate signals.
- Keep ranking decomposable and inspectable.

## Supported Query Families

V1 must support combinations of:

- canonical identity: character, Pokemon, Trainer, set, number, artist, rarity, printing, year
- subject role: scene subject, depicted subject, character representation
- subject count and repeated-element count
- anatomy and visible physical features
- human body-region visibility and factual clothing attributes
- pose, orientation, action, and visible state
- objects, props, food, plants, structures, and visual effects
- relationships such as holding, beside, behind, standing on, printed on, or shaped like
- environment, terrain, sky, visible weather cues, and visible time-of-day cues
- color, palette, lighting, shadows, highlights, composition, framing, and motifs
- supported represented-character and cameo-like appearances
- colloquial query aliases that resolve to objective visual evidence
- zero-result and exclusion behavior

Examples:

```text
Pikachu sleeping in a forest
trainers wearing gloves
cards with three visible lightning bolts
purple-haired person with blue jewelry
Pokemon floating over water
Pikachu shown on a poster
Pikachu-shaped pillow
dark artwork with strong backlighting
stoner-looking cards
```

The last example is an intent alias. It must map to evidence such as smoke or vapor plus red-eye, half-closed-eye, or drooping-eyelid cues. The system must explain the cues and must not claim that a character is intoxicated.

## Query Intent Shape

The deterministic parser should produce a typed intent similar to:

```json
{
  "canonical_filters": {
    "subjects": ["Pikachu"],
    "set_codes": [],
    "years": null,
    "artist": []
  },
  "visual_filters": {
    "subject_roles": ["scene_subject"],
    "concepts": ["sleeping", "forest"],
    "colors": [],
    "counts": [],
    "relationships": []
  },
  "query_aliases": [],
  "negative_filters": [],
  "unrecognized_terms": []
}
```

Unsupported or ambiguous terms must remain visible in `unrecognized_terms`. They must not be silently converted into visual facts.

## Subject Role Contract

These roles must remain rigidly separate in indexing, query intent, scoring, explanations, and evaluation:

- `scene_subject`: a living entity or character physically present in the illustrated scene
- `depicted_subject`: a character or entity shown inside another visible surface, such as a poster, photograph, card, screen, painting, sign, or book
- `character_representation`: an object whose appearance represents a character, such as a plush, pillow, statue, toy, food shape, logo, sticker, or pattern

A query for `Pikachu` may search all roles only when the user does not specify a role, but role weighting and the matched role must be visible. A query for `Pikachu pillow` must not rank a physically present Pikachu as an exact role match.

## Visual Fact And Alias Policy

Raw observations, typed facts, semantic visual facts, and canonical visual concepts remain governed by Fact Graph V2 and the controlled vocabulary contract.

Query aliases are search-facing transformations, not stored character truths.

Examples:

```text
stoner / high / smoked out
-> smoke or vapor cues + red-eye or eyelid cues

Halloween
-> supported combinations of pumpkins, bats, tombstones, candles, ghost forms, ghost flames, or related visible motifs

ghostly
-> supported ghost forms, spectral wisps, translucent forms, ghost flames, or comparable visible cues
```

Rules:

- A single weak cue must not automatically establish a compound alias match.
- Alias derivation must cite the underlying visual observations.
- Alias matches must be labeled as query-intent matches, not facts about identity, personality, lore, or real-world condition.
- Circular evidence does not count.
- Unsupported aliases produce no visual match rather than an invented one.

## Search Projections

V1 uses three deterministic documents per artwork group:

### Subject Document

Includes supported subject roles, identities when independently canonical or visibly supported, anatomy, physical features, human appearance, clothing, pose, orientation, action/state, facial evidence, and subject-specific relationships.

### Scene Document

Includes environment, sky, terrain, plants, structures, objects, props, counts, weather/time cues, scene relationships, and visual effects.

### Style And Composition Document

Includes palette, lighting, contrast, framing, camera angle, cropping, depth, motion cues, motifs, repeated shapes, and objective style cues.

### Reserved Representation/Cameo Document

A fourth isolated projection is reserved for depicted subjects and character representations if evaluation shows that mixing them into subject or scene retrieval creates role confusion. It is not required for V1 implementation.

Projection text must be deterministic. Raw graph JSON and compatibility prose must not be embedded as one undifferentiated document.

## Artwork Grouping And Printing Expansion

Search retrieval operates on artwork groups first.

Required order:

1. Retrieve and rank distinct artwork groups.
2. Attach canonical card-print identities that legitimately use that artwork.
3. Apply canonical filters to printing expansion.
4. Show a representative printing and allow the user to inspect all matching printings.

Rules:

- Shared artwork must not crowd the result set with near-identical printings.
- A visual match does not prove a printing-specific stamp, finish, border, error, logo, or text line.
- Printing expansion must preserve exact/representative image confidence.
- A correct artwork with an incorrect printing expansion is an evaluation failure.

## Ranking Contract

Ranking must remain decomposable. A result must retain separate score components for:

- canonical subject or metadata match
- structured visual concept match
- lexical evidence match
- vector similarity
- evidence confidence
- eligibility-tier adjustment
- subject-role adjustment
- artwork-duplication adjustment
- optional human-approval adjustment

The final score must not exist only as an opaque vector score. Exact weights are not fixed here; they are calibrated and locked through `CARD_VISUAL_SEARCH_EVALUATION_V1`.

Tier B may be down-ranked but must not be described as false. Human approval may improve confidence but cannot replace evidence.

## Filtering Contract

Structured filters must take precedence over semantic similarity when the query explicitly requires:

- a canonical subject
- a subject role
- an exact count
- a color
- a garment or accessory
- a pose/action/state
- an environment or object class
- a printing/set/year boundary

Vector retrieval may broaden candidates, but it must not override a contradictory structured filter.

## Why-Matched Contract

Every visual result must provide an evidence-backed explanation. A match unit includes:

```json
{
  "query_concept": "sleeping",
  "matched_concept": "sleeping",
  "subject_role": "scene_subject",
  "fact_ids": ["fact_pose_02"],
  "observation_ids": ["obs_pose_02", "obs_eyes_01"],
  "field_paths": ["modules.subjects[0].action_state"],
  "evidence_summary": "closed eyes and lying-down body position",
  "score_component": 0.91
}
```

Explanations must be generated from stored references. They must not call a model or write new narrative claims at query time.

## Negative And Zero-Result Behavior

- No supporting evidence means no visual match for that constraint.
- A query may return a valid zero-result state.
- Unrecognized terms must be displayed or logged as unsupported, not silently dropped.
- Results that satisfy only some requested concepts must disclose which concepts matched and which did not.
- Strict `AND` intent must not be weakened to `OR` without a visible user-facing relaxation.
- Negative filters must exclude only evidence-backed concepts or canonical metadata.

## Proposed Result Shape

```json
{
  "artwork_group_id": "stable-derived-id",
  "representative_card": {
    "card_print_id": "uuid",
    "gv_id": "GV-PK-...",
    "name": "Pikachu",
    "image_confidence": "exact"
  },
  "matching_printings": [],
  "score": 0.0,
  "score_components": {},
  "matched_evidence": [],
  "matched_subject_roles": ["scene_subject"],
  "eligibility_tier": "A",
  "unmatched_query_terms": []
}
```

Internal UUIDs may be present in service responses but must not replace public `gv_id` routing on collector surfaces.

## Privacy And Query Logging

Query logging must:

- minimize collected user data
- avoid storing ownership or account context unless required for an explicit feature
- separate raw query text from analytics identifiers where practical
- define retention before public release
- permit deletion under account/privacy policy
- record parser version, index version, latency, and result/evaluation signals
- never feed private queries into model training or new extraction without separate authorization

## Availability And Failure Behavior

- Canonical search must remain available if visual search is degraded.
- Visual-search failure must not mutate canonical filters or results.
- Index version and query parser version must be observable in diagnostics.
- Partial result sources must be declared rather than silently combined.
- Rollback must restore the prior active immutable index release.

## Non-Goals

- Generative answers in the normal search path
- AI-authored SQL
- Story generation
- Canonical identity mutation
- Automatic human approval
- Taste Engine or Grookai Signature ranking
- Public print-marker claims derived from shared artwork
- Full multilingual search in V1

## Acceptance Gate

Visual search may not become public until:

1. The corpus, index schema, and evaluation contracts are approved.
2. A corpus release reconciles exactly.
3. The index builds idempotently and rolls back safely.
4. The fixed evaluation suite establishes and then passes locked thresholds.
5. Why-matched evidence references validate.
6. Subject-role and printing-expansion failure rates meet the locked standard.
7. Security, RLS, and public response boundaries pass targeted tests.

## Related Contracts

- `docs/contracts/SEARCH_CONTRACT_V1.md`
- `docs/contracts/GROOKAI_SMART_SEARCH_V1.md`
- `docs/contracts/CAMEO_SEARCH_V1.md`
- `docs/contracts/CARD_VISUAL_FACT_GRAPH_V2.md`
- `docs/contracts/CARD_VISUAL_CONTROLLED_VOCABULARY_V1.md`
- `docs/contracts/CARD_VISUAL_CORPUS_V1_BLUEPRINT.md`
- `docs/contracts/CARD_VISUAL_SEARCH_INDEX_SCHEMA_V1.md`
- `docs/contracts/CARD_VISUAL_SEARCH_EVALUATION_V1.md`
