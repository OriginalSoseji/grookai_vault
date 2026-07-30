# Card Visual Cameo Reference Import V1

## Status

Active offline import contract.

## Purpose

Import RotomAmiti's Cameo Pokémon Card Database as curated external reference evidence, preserve its provenance, and reconcile records to Grookai canonical card-print identities without paying for another model run.

This contract does not alter the Card Visual Fact Graph. It creates evidence that can be reviewed and merged through a later governed policy.

## Authority Boundary

The source may establish:

- a curator-recorded association between a cameo identity and a card;
- a display form when the source Notes cell explicitly names that form;
- source formatting signals documented by the spreadsheet author:
  - italic card name means edge case;
  - light-blue row means not released in English;
  - merged card-name cells mean shared artwork.

The source does not establish:

- a pixel location;
- exact anatomy, pose, count, or relationship;
- which individual object depicts a named Pokémon when multiple objects are visible;
- a Fact Graph observation ID;
- final subject-kind classification when Notes are absent or ambiguous;
- approval for search activation or database writes.

## Canonical Reconciliation

Automatic reconciliation requires one exact normalized target across:

- set name;
- card name;
- card number.

Normalization may standardize Unicode, apostrophes, whitespace, diacritics, and leading number zeroes. It may not infer a different set, card, or number.

Multiple canonical targets are `ambiguous_multiple_canonical_prints`.

No canonical target is `unmatched`.

Neither result may be silently promoted.

Current sheet rows are first compared with the repository's previously approved
`card_print_cameos` seed and refresh artifacts. An exact logical relationship
match is recorded as already approved evidence, not as a new candidate.

For source sets newer than the English master-index snapshot, a set-code alias
may be derived from the immutable paid visual corpus only when at least two
distinct card name + number pairs agree on one and only one set code. This
derivation does not alter the paid Fact Graph.

## Evidence Model

Every imported row records:

- source spreadsheet, tab, sheet ID, and row;
- source hash and deterministic source record ID;
- cameo identity;
- card name, set, and number;
- raw Notes;
- decoded formatting evidence;
- display modes derived only from explicit Notes;
- a non-final subject-kind candidate;
- exact canonical reconciliation status;
- evidence boundaries.

Blank Notes mean `display_mode_terms: []`. Blank Notes do not mean a scene subject.

## Slurpuff ASC 094 Invariant

The import must preserve, at minimum, the independent sheet rows for:

- Pikachu on Slurpuff, Ascended Heroes 94;
- Snorlax on Slurpuff, Ascended Heroes 94, with Notes `sweets`.

Additional source rows for the same card are preserved rather than discarded.
The import must not assign the held cookie a Pokémon identity. The spreadsheet
establishes card-level cameo associations, not the location or identity of each
cookie.

## Immutable Boundaries

This gate performs:

- zero OpenAI calls;
- zero database reads or writes;
- zero approvals;
- zero embeddings;
- zero Fact Graph mutations;
- zero search activation.

Existing paid Fact Graph artifacts remain immutable.

## Required Artifacts

- `run_plan.json`
- `source_manifest.json`
- raw XLSX snapshot
- raw CSV snapshot per listing tab
- `cameo_reference_rows.jsonl`
- `canonical_matches.jsonl`
- `ambiguous_matches.jsonl`
- `unmatched_rows.jsonl`
- `visual_corpus_overlap.jsonl`
- `visual_corpus_set_alias_evidence.json`
- `existing_approved_missing_from_current.json`
- `summary.json`
- `CAMEO_REFERENCE_RECONCILIATION.md`
- `artifact_hashes.json`

## Next Gate

After review, define a deterministic evidence-merge policy that adds external provenance beside existing Fact Graph evidence. Do not overwrite paid observations. Search activation requires its own reviewed gate.
