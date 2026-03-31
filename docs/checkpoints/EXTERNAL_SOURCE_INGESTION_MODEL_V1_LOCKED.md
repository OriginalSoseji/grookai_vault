# EXTERNAL_SOURCE_INGESTION_MODEL_V1_LOCKED

## Status

`ACTIVE / LOCKED / VERIFIED AGAINST CURRENT REPO LAW`

## Date

`2026-03-31`

## Context

Grookai already ingests multiple external sources, but the repo had not yet locked one authoritative cross-source ingestion model that explains how canon-bound external rows may move toward canonical truth.

Recent JustTCG work made the gap explicit:

- JustTCG raw card payloads now land lawfully in `public.raw_imports`
- read-only normalization work proved deterministic parsing of upstream number and name shapes
- read-only match work proved deterministic comparison against current canon and `external_mappings`
- read-only canon-gate work proved that clean numeric candidates can be separated from printed-identity review rows and non-candidates

At the same time, the current canon warehouse remained intentionally evidence-driven and user-submission oriented.

That meant Grookai needed a locked architectural decision before any external discovery staging write lane could be built.

## Problem

Without a single authoritative ingestion model, external-source work could drift into conflicting patterns:

- direct source-specific raw tables
- direct writes from external discovery into canon
- external discovery candidates forced into the current evidence-driven warehouse
- upstream formatting treated as canonical identity

That would break provenance, weaken canon authority, and blur the difference between:

- external discovery receipts
- physically evidenced user submissions

## Risk

The specific risks were:

- external rows being treated as truth because they exist upstream
- alpha-suffixed or synthetic numbering being accepted as canon-ready without printed proof
- parenthetical modifiers being misread as canonical identity
- loss of raw provenance between source receipt and later review
- replay-unsafe duplicate candidate generation
- architectural confusion between the current evidence-driven warehouse and future external discovery staging

## Decision

Grookai locks the following direction:

- all canon-bound external-source intake enters through `public.raw_imports`
- external rows then move through:
  - raw intake
  - normalization
  - comparison / match
  - canon gate
  - review / staging
  - canon promotion
- no external source may write directly into canon
- current canon warehouse intake is not automatically reusable for external discovery candidates
- a dedicated external discovery staging layer is the next system to build

This decision is formalized in:

- [EXTERNAL_SOURCE_INGESTION_MODEL_V1](./../contracts/EXTERNAL_SOURCE_INGESTION_MODEL_V1.md)

## Alternatives Rejected

Rejected alternatives:

- dedicated per-source raw intake tables by default
- direct external-source writes into `card_prints`
- skipping normalization and matching because an upstream ID exists
- treating current evidence-driven warehouse intake as the default sink for external discovery rows
- dropping upstream provenance once a row becomes a candidate

## Current Truths

Current verified truths in repo reality:

- `raw_imports` is the shared raw ingress lane for canon-bound external intake
- JustTCG raw card payloads now land in `raw_imports` lawfully
- current warehouse intake requires uploader identity, notes, and evidence
- current warehouse evidence kinds are designed for physical evidence packages, not external discovery receipts
- read-only normalization, match, and canon-gate queries proved the raw-first model is workable before any write-side discovery staging exists
- source-isolated pricing domains may continue to exist independently, but they do not become canon-bound until they enter the raw-first model
- external sources remain non-canonical and reference-only until Grookai-controlled gates are satisfied

## Invariants

1. External source rows are never canon by default.
2. `public.raw_imports` is the lawful shared ingress lane for canon-bound external intake.
3. Normalization is required before comparison.
4. Comparison is required before canon-gate classification.
5. Canon-gate classification is required before any review or staging write lane.
6. The current evidence-driven warehouse is not a drop-in destination for external discovery candidates.
7. Canon promotion remains a separate governed action after all prior phases.
8. Provenance must survive every phase.

## Why It Matters

This checkpoint matters because it converts a scattered set of ingestion truths into one locked architectural rule.

Grookai now has a formal repo memory that says:

- all external sources flow through a shared raw-first ingress
- source coexistence is lawful at the raw layer
- canon authority stays inside Grookai
- discovery and evidence are not the same thing

That gives the next phase a clear target:

- build an external discovery staging layer that is provenance-preserving, replay-safe, and separate from the current evidence-driven user warehouse

## Next Step

Build the dedicated external discovery staging layer on top of the locked raw-first external ingestion model.
