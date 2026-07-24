# PRINTING_TRUTH_CONTRACT_V1

Status: Active
Date: 2026-05-23

## Principle

Grookai may be incomplete temporarily, but it must not confidently store or display fake printings.

## Verifiable Printing Rule

A `card_printings` row is canonical only when the exact parent card and finish are backed by explicit evidence:

- exact external printing mapping, or
- checked source payload evidence for that parent card and finish, or
- approved manual/physical proof artifact.

Heuristics, era assumptions, source boolean flags without proof review, naming guesses, and "probably exists" reasoning are not authority.

## Fail-Closed Rule

Unknown printing state fails closed:

- no reverse holo row from era-wide assumptions,
- no default finish row creation from heuristics,
- no specialty finish row without exact proof,
- no generated variant preserved as truth without evidence.

## Quarantine Rule

Unsupported, conflicting, or unverifiable rows must be isolated before deletion. Cleanup requires a separate approved migration plan with ownership/provenance impact proof.

Allowed review statuses:

- `verified`
- `unsupported`
- `conflicting`
- `unverifiable`
- `quarantined_candidate`

## Generator Rule

Printing generators must require proof metadata. A worker may discover candidate finishes, but discovery is not permission to write `card_printings`.

Required proof fields for writes:

- source
- external_id or proof artifact id
- evidence_type
- exact finish_key
- exact parent card_print_id

## Source Semantic Precedence

Provider transport shape is not physical printing truth.

- `normal` means an explicitly proven physical Normal or non-holo printing; it never means no finish token, unqualified rarity, raw/ungraded, generic product, or not otherwise Holo.
- Exact official, human-readable, or governed checklist evidence outranks a provider taxonomy or price-bucket name.
- A provider variant flag may classify evidence but does not prove a canonical child printing by itself.
- An explicit finish suffix on a price metric is authoritative only for that evidence hint.
- An unsuffixed, missing, partial, ambiguous, or contradictory price/variant shape must remain review-only.
- Pricing evidence may select an already verified child printing. It may never create, restore, delete, or rename `card_printings`.
- If no verified child exists, retain the evidence as unmatched or review-only.

The binding TCGdex/Cardmarket normalization truth table is defined by `INGESTION_PIPELINE_CONTRACT_V1` and `TCGDEX_SOURCE_CONTRACT_V1`.

## Set Invariant Gate

Any pipeline that can mutate canonical child-printing identity must declare and assert, before planning and again immediately before commit:

- exact parent count;
- exact total printing count;
- exact counts by finish;
- zero duplicate exact printing identities;
- zero suppressed or forbidden printing facts;
- presence of all protected printing facts;
- zero unresolved source conflicts.

The post-commit readback must prove the same invariants. Missing counts, drift, or a pricing-only proof blocks the write.

For ME04 Chaos Rising, the permanent regression profile is `122` parents, `202` child printings, `68` Normal, `76` Reverse Holo, and `58` Holo. The exact 45 historical false Normal suppressions, the four protected Build & Battle Normal printings, and Holo-only `109 Jumbo Ice Cream` are binding.

## Stop Rule

Stop before destructive cleanup if any candidate row has vault ownership references, unresolved source disagreement, missing provenance, or identity-law ambiguity.

Stop before any printing write if the per-set truth manifest, exact finish counts, suppression proof, protected-fact proof, pre-commit assertion, rollback plan, or final readback is missing.
