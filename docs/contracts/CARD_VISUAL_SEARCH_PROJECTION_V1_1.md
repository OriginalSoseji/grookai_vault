# CARD_VISUAL_SEARCH_PROJECTION_V1_1

Status: Superseded by `CARD_VISUAL_SEARCH_PROJECTION_V1_2`

Date: 2026-07-21

## Purpose

V1.1 preserves the V1 evidence model, three-document layout, eligibility inputs, hashes, and no-write boundaries. It repairs two semantic-cleanliness failures found by inspecting the first full V1 projection.

## V1 Findings

- Source taxonomies such as `illustrator_text`, `hp_text`, `card_name_text`, `set_symbol`, `rarity_mark`, and mechanics text were not recognized as card UI and entered scene documents.
- Some generic observations describing subject anatomy, body color, or physical features entered scene documents even when subject-module typed facts cited those observations.

The V1 artifact remains immutable evidence of the failed semantic-cleanliness gate. It is not a locked search corpus.

## Card UI Classification

Projection exclusion is field-aware. It considers:

- source module, field path, category, and observation kind;
- explicit card-UI observation ID namespaces;
- narrowly defined card UI and mechanics terminology when source taxonomy is ambiguous.

Card names, HP, illustrator credits, attacks, abilities, rules, stages, evolution labels, set/rarity/type/energy symbols, legal text, collector numbers, print stamps, card logos, watermarks, and physical print markers must never enter artwork documents. Logos or character representations visibly integrated into the illustrated scene remain eligible when their taxonomy and evidence identify them as artwork rather than card UI.

Text visibly present inside the illustrated scene may remain when its evidence taxonomy identifies an environment sign or another artwork object and no card-UI evidence is present.

## Evidence-Linked Routing

Observations remain unchanged. Projection derives routing context from their references:

- observations cited by subject roles, creature anatomy, human appearance, clothing, pose, or subject semantic facts route to `subject`;
- observations cited by composition, color/light, framing, motif, or other design facts route to `style_composition` unless subject evidence takes precedence;
- remaining environment, object, relationship, and effect evidence routes to `scene`;
- a count supported by a subject observation routes to `subject`; other counts route to `scene`.

This changes projection placement only. It does not add, rewrite, or delete source facts.

## Preserved V1 Contract

All other rules in `CARD_VISUAL_SEARCH_PROJECTION_V1.md` remain binding, including:

- one source graph per locked Artwork Grouping V1.1 group;
- Tier A and Tier B only, with Energy and Tier C excluded;
- `subject`, `scene`, and `style_composition` documents for every artwork;
- valid observation support for every projected entry;
- deterministic document text, IDs, hashes, exclusions, and reconciliation;
- conservative Tier B guards;
- no provider calls, database connections or writes, approvals, embeddings, index writes, or public reads.

## Acceptance Criteria

- Every locked artwork and printing reconciles.
- Exactly three deterministic documents exist per artwork.
- No card UI or print-marker evidence appears in any artwork document.
- Subject-linked anatomy and appearance observations route to the subject document.
- Artwork sign text is not removed solely because it contains text.
- No source facts are introduced or mutated.
- A replay from the same source hashes produces identical semantic content and hashes.

## Exact Next Gate

After the full V1.1 projection passes semantic-cleanliness inspection, run the fixed offline lexical and structured evaluation suite. Do not generate embeddings or write a migration until evaluation passes.
