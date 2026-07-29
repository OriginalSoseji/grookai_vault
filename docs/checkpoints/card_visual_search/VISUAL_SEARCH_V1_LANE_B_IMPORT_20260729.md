# Visual Search V1 Lane B Import

Date: 2026-07-29

Status: COMPLETE; CALIBRATION TOOLING IMPORTED; HUMAN JUDGMENTS PENDING

## Purpose

This checkpoint records the exact transfer of the five deferred Visual Search
V1 calibration-tooling files onto the production-based productization branch.

## Provenance

- Branch: `feature/visual-search-v1-productization`
- Pre-import SHA: `d3e9042cfd4b0d4432cdb91940d615f2d687aeea`
- Governed source SHA: `c5bbbba5dea998fcd51d0d8602601737356a1494`
- Manifest version: `CARD_VISUAL_SEARCH_SOURCE_IMPORT_MANIFEST_V1_1`
- Manifest payload SHA-256:
  `7bd6f0c7d1f2826c981dde5431d2b9850adea264d6a51d9e24232558fe17658f`
- Import version: `CARD_VISUAL_SEARCH_LANE_B_IMPORT_V1`

## Import Result

- Planned files: `5`
- Written files: `5`
- Matching hashes: `5`
- Missing files: `0`
- Extra files: `0`
- Mismatches: `0`
- Status: `reconciled`
- Plan payload SHA-256:
  `b18cc0beb7e6aff5337a6451b41f8702c50563ae4972500783c98a12a1fb52c8`
- Reconciliation payload SHA-256:
  `97f8e0e9eed134c4f12aab0add91764b2a4a32de83fc8cc46440e54ea0651cfb`

Imported:

- calibration evaluator backend
- calibration evaluator command wrapper
- calibration evaluator focused test
- calibration evaluator active contract
- judgment-packet command wrapper

## Validation

- Combined Lane A/Lane B/manifest/import contracts: `98/98` passed
- Lane B importer syntax: passed
- No holdout execution path: confirmed by contract
- No provider, database, embedding, or mutation path: confirmed by contract

The evaluator fixtures prove:

- complete primary reviewer submissions validate;
- missing labels and provenance mismatches fail closed;
- difficult families require two independent reviews;
- disagreements block official metrics and create adjudication work;
- global and family-stratified metrics are deterministic.

## Current Truths

- Deterministic search and calibration code now live on the main-based branch.
- PokeJavi has not completed the 200-query calibration packet.
- No reviewer export has been imported.
- The 50-query holdout remains sealed.
- No official release thresholds exist.
- No database write, provider call, embedding, or public search activation
  occurred.
- Pricing remains untouched.

## Exact Next Gate

Package the existing locked corpus evidence as an immutable external release,
then rebuild and reconcile the full structured/lexical index on the
productization branch.

This work may proceed while PokeJavi reviews. Official calibration scoring,
threshold freeze, and holdout execution remain blocked on completed,
reconciled human judgments.
