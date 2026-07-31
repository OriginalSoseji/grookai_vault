# Card Visual Search Evidence Suppression V1

Status: Active

## Purpose

Correct unsupported visual evidence without mutating or repurchasing the paid
Fact Graph.

## Authority

Only founder image-confirmed review can create an active suppression in V1.
Each record is pinned to an artwork group, canonical printing, source image
SHA-256, and exact observation or source IDs.

## Behavior

- The paid source artifact remains unchanged.
- Every structured claim backed by a suppressed observation is excluded.
- The release index omits the suppressed terms.
- Runtime hydration returns suppression records and filters source documents.
- Suppressions are immutable within a validated release.
- A correction becomes active only in a later governed release.

## Prohibitions

A suppression cannot:

- invent or authorize a replacement fact;
- apply to a different source image;
- change canonical identity;
- erase source audit evidence;
- become active from a collector report without founder review;
- trigger a provider call, embedding, or Fact Graph rewrite.

## Validation

Every suppression must match at least one projected document concept and one
atomic evidence row. Missing groups, printing mismatch, image-hash drift,
empty targets, or zero matches fail the release closed.
