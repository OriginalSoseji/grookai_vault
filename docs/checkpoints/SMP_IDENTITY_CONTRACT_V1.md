# SMP_IDENTITY_CONTRACT_V1

## Context

`smp` is not a standard expansion-number lane. It is the Sun & Moon Black Star Promo family, and its printed promo code is the authoritative public identity.

That means Grookai must preserve the full printed promo number instead of reducing it to digits or treating it like a normal set-number lane.

## Contract

Sun & Moon Black Star Promos are treated as:

- family: `SM`
- canonical source lane: `smp`
- authoritative printed identity: exact promo code in `SM##` or `SM###` form

Canonical `gv_id` format:

- `GV-PK-SM-<PRINTED_NUMBER>`

Examples:

- `GV-PK-SM-SM01`
- `GV-PK-SM-SM22`
- `GV-PK-SM-SM153`

## Identity Model

Canonical base identity key for `smp` is:

- `(smp, printed_number, identity_qualifier)`

Where:

- `printed_number` is the exact printed promo code, such as `SM01` or `SM153`
- `identity_qualifier` is empty for ordinary promo identity
- qualifiers are only allowed when separately proven under `GV_ID_VARIANT_SUFFIX_CONTRACT_V2`

`SM01`, `SM22`, and `SM153` are distinct canonical identities. They are not reduced to `1`, `22`, or `153`.

## Matching Rule

Lawful matching for `smp` uses:

- exact printed promo number
- normalized card name
- proven identity qualifier when applicable

Digit-only matching may be used as a secondary audit aid, but never as the primary identity rule.

## Promotion And Collapse Rules

Promotion is lawful only when:

- the row belongs to `smp`
- the exact printed promo number is present and valid
- no canonical overlap already owns that promo identity
- the proposed `GV-PK-SM-<PRINTED_NUMBER>` is unique
- any qualifier is separately proven and contract-valid

Collapse is lawful only when:

- a canonical `smp` target already exists
- the target owns the same printed promo number
- the target matches the same normalized name
- qualifier state matches on both sides
- there is zero ambiguity and zero same-number different-name conflict

## Builder Enforcement

`buildCardPrintGvIdV1` now treats `smp` as a dedicated promo-family namespace:

- detects the family from `setCode = smp` or explicit `SMP` family token
- emits namespace token `SM`, not `SMP`
- requires the exact printed promo code from `number`
- emits `GV-PK-SM-<PRINTED_NUMBER>`
- rejects missing promo code with `gv_id_smp_promo_number_missing`
- rejects malformed promo code with `gv_id_smp_promo_number_invalid`

`numberPlain` is not used as the primary source for `smp` generation.

## Variant Boundary

Base unsuffixed namespace belongs to the ordinary printed promo identity.

Examples of allowed separately proven extensions:

- `GV-PK-SM-SM01-STAFF-STAMP`
- `GV-PK-SM-SM01-PRERELEASE-STAMP`

This contract does not assume such variants exist globally across `smp`. They remain case-by-case proof work.

## Immediate Effect

Grookai now preserves Sun & Moon Black Star Promo printed identity in public `gv_id` form and prevents digit-only namespace drift.

This unblocks the next lawful phase:

- `SMP_RECLASSIFICATION_AUDIT_V1`

That audit should determine which unresolved `smp` rows are collapse-safe, promotion-safe, blocked by conflict, or require variant review.
