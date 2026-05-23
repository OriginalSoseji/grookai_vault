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

## Stop Rule

Stop before destructive cleanup if any candidate row has vault ownership references, unresolved source disagreement, missing provenance, or identity-law ambiguity.
