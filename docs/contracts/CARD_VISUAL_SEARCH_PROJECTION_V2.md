# Card Visual Search Projection V2

Status: Active

Date: 2026-07-30

## Purpose

Projection V2 extends the evidence-preserving V1.5 projection with:

- an isolated `representation_cameo` document;
- five explicit appearance roles;
- deterministic TCG visual concepts;
- evidence authority and governance metadata;
- strict separation of intrinsic resemblance from independent identity
  presence.

## Documents

Every eligible artwork produces exactly four documents:

1. `subject`
2. `scene`
3. `style_composition`
4. `representation_cameo`

Depicted subjects, character representations, and resemblance references do
not enter normal scene-subject evidence.

## Derivation Order

```text
source Fact Graph entries
-> global and eligibility guards
-> accepted evidence
-> deterministic TCG concepts
-> the same global and eligibility guards
-> four search documents
```

A blocked source claim cannot re-enter through a derived concept.

## Evidence

Every projected entry must cite at least one valid observation ID. External
evidence is loaded later as a release assertion and is never inserted into
Fact Graph projection rows.

## Boundary

Projection V2 is offline and deterministic. It makes no provider call,
database connection, database write, approval, embedding, or public read.

