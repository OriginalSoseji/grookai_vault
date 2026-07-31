# CARD_VISUAL_SEARCH_REPRESENTATION_COVERAGE_V1

Status: Active - offline audit only

Date: 2026-07-29

## Purpose

This audit determines whether saved Fact Graphs contain structured character
representations and depicted subjects, and identifies processed rows where
existing evidence may support a missing typed role.

It does not create visual facts, call a model, or change the locked search
projection.

## Inputs

- `CARD_VISUAL_CORPUS_SOURCE_INVENTORY_V1`
- immutable generated-row source artifacts
- the governed Japanese/English Pokemon identity map

Every source path must remain beneath the explicitly configured artifact root.

## Structured Coverage

The audit records:

- rows with `character_representations`
- rows whose represented identity matches the Pokemon identity lexicon
- rows with `depicted_subjects`
- representation-form distribution
- depicted-surface distribution
- governing `subjects` module-review status

## Omission Candidates

Candidates are review leads, not asserted corrections.

A Pokemon representation candidate requires one evidence row containing:

- a governed Pokemon identity or the literal Pokemon class
- a supported representation cue
- an observation reference

Strong generic forms such as plush, pillow, statue, food shape, and ice cream
may become generic review candidates without being labeled as Pokemon.

Card UI evidence, ordinary visual patterns, unrelated logos, and generic toy
language cannot create Pokemon representation facts.

## Outputs

- `run_plan.json`
- `summary.json`
- `representation_candidates.jsonl`
- `REPRESENTATION_COVERAGE_AUDIT.md`
- `artifact_hashes.json`

## Boundaries

The audit has no path for provider calls, database connections or writes,
approvals, embeddings, holdout execution, source-artifact mutation, search
activation, or public release.

## Interpretation

`No indexed evidence` does not mean a card or visual form does not exist. A
candidate can indicate that an image was processed but its role ontology was
omitted or misclassified. Cards outside the processed corpus remain a separate
coverage gap.
