# Card Visual Search Corpus Release V2

Status: Active

Date: 2026-07-30

## Purpose

This contract governs the zero-AI repair and release of the existing paid
visual corpus.

The release reuses the immutable V1.1 source package and builds:

- a four-document V2 projection per eligible artwork;
- deterministic TCG visual concepts;
- a repair and coverage ledger;
- private external-evidence candidates;
- governed image-confirmed or role-confirmed assertions;
- founder image-confirmed negative-evidence suppressions;
- materialized lexical and structured index entries;
- a no-write database load plan.

## Immutable Inputs

Every source generated-row hash, Fact Graph hash, source-image hash, eligibility
decision, artwork membership, and external snapshot hash must reconcile before
the release can pass.

The release never edits a paid Fact Graph.

Founder-confirmed suppressions remove unsupported source observations and all
derived terms from the release index. They are exact, image-hash-pinned,
release-scoped decisions. They cannot introduce a replacement fact.

## Complete Accounting

Every selected `card_print_id` appears exactly once as either:

- an eligible printing linked to an artwork group; or
- a Tier C coverage gap.

Energy rows are prohibited from searchable artwork and printing outputs.
Previously paid Energy extractions may remain visible as excluded Tier C
coverage-gap accounting; exclusion is not publication.

Each eligible artwork has exactly these documents:

- `subject`
- `scene`
- `style_composition`
- `representation_cameo`

## External Evidence

Permitted external data enters candidate staging. Exact canonical matching does
not grant visual authority.

Only these may enter a release assertion:

- observation-backed evidence;
- founder/human image-confirmed evidence;
- external evidence whose appearance role is explicitly confirmed.

Role-unresolved associations remain review-only. Intrinsic resemblance cannot
prove another independently present character.

External evidence IDs are governed strings. They are not fabricated
observation IDs and are not copied into the paid graph.

## Repair Ledger

Every artwork ledger records:

- source hashes;
- eligibility and review status;
- projected document, evidence, exclusion, and TCG-concept counts;
- appearance roles;
- external candidate and active assertion counts;
- diagnostics;
- release disposition;
- `source_payload_mutated: false`.

Low evidence density is a diagnostic, not a quota failure.

## Release Gate

The artifact release passes only with:

- exact source-ID accounting;
- zero source hash mismatch;
- zero missing evidence reference;
- zero unresolved or image-mismatched evidence suppression;
- zero duplicate artwork, printing, document, candidate, assertion, or index
  identity;
- four documents per artwork;
- zero Energy rows;
- zero provider calls and zero AI cost;
- zero database connections or writes;
- zero embeddings;
- inactive release pointer.

## Database Gate

The generated load plan is not permission to apply the migration or load data.
Migration apply, staged release load, readback, validation, and activation
remain separate governed gates.

The active pointer must remain empty until calibration, high-risk regressions,
the sealed holdout, RLS/RPC smoke tests, and exact load reconciliation pass.
