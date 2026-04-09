# CEL25_IDENTITY_MODEL_GAP_AUDIT_V1

## Context

`cel25` is fully resolved except for one remaining unresolved row:

- `DUPLICATE_COLLAPSE = 25` complete
- `BASE_VARIANT_COLLAPSE = 20` complete
- `STAR_SYMBOL_EQUIVALENCE = 1` complete
- residual unresolved surface = `1`

This audit is read-only. No mutation was performed.

## Row Analysis

Residual row:

- `row_id = f7c22698-daa3-4412-84ef-436fb1fe130f`
- `name = Gardevoir ex`
- `printed_token = 93A`
- `variant_key = ''`
- `normalized_name = gardevoir ex`
- `normalized_token = 93`

Same-set canonical candidate analysis returned exactly one logical target:

- `candidate_id = b4a42612-945d-419f-a4f4-c64ae5c26d6b`
- `candidate_name = Gardevoir ex δ`
- `candidate_printed_token = 93`
- `candidate_variant_key = cc`
- `candidate_gv_id = GV-PK-CEL-93CC`
- `match_type = suffix`

There are no alternative canonical targets in `cel25`.

## Semantic Difference

Compared names:

- source: `Gardevoir ex`
- candidate: `Gardevoir ex δ`

The difference is not punctuation drift.

It is:

- `semantic_difference_type = decorated_form_delta_species_modifier`
- `delta_role = identity_bearing_modifier`

Repo-grounded proof:

- `δ` is absent from the source row
- `δ` is present only in the canonical target printed name
- live canon contains both `Gardevoir ex` and `Gardevoir ex δ` as distinct name surfaces:
  - `Gardevoir ex = 10` canonical rows across `ex2`, `sv01`, `sv4pt5`, and one legacy-null set code surface
  - `Gardevoir ex δ = 2` canonical rows across `cel25` and `ex15`

## Model Limitation

Exact cause:

- `model_limitation = MULTI_DIMENSIONAL_IDENTITY_REQUIRED`

Why:

1. `cel25` Classic Collection already consumes the current structured variant lane through `variant_key = cc`.
2. The identity-bearing `δ` modifier is not structurally modeled anywhere else.
3. The modifier currently survives only in `card_prints.name`.

Live corpus evidence:

- canonical `δ` rows in canon: `194`
- sets with canonical `δ` rows: `11`
- canonical `δ` rows with blank `variant_key`: `193`
- canonical `δ` rows with nonblank `variant_key`: `1` (`cel25` Classic Collection)
- canonical `δ` rows with explicit delta-specific trait hits in `card_print_traits`: `0`

That means Grookai currently has no structured second identity dimension for delta-species when another canonical modifier already exists.

## Why Collapse Is Unsafe

Hypothetical collapse:

- `Gardevoir ex / 93A -> Gardevoir ex δ / GV-PK-CEL-93CC`

Decision:

- `collapse_safety = unsafe`

Reason:

- collapsing would erase an identity-bearing printed modifier
- the source row does not prove `δ`
- the target row does prove `δ`
- printed identity precedence would be violated by treating the modifier as disposable normalization

This is not:

- duplicate collapse
- base-variant normalization
- alias collapse
- symbol equivalence

It is a model-boundary issue.

## Required Extension

Minimal bounded extension:

- `required_extension_type = delta_species_printed_identity_dimension`
- `target_layer = card_prints`

Why `card_prints`:

- `δ` changes canonical printed identity, not finish
- `card_printings` is unlawful because the modifier is not a finish layer
- `card_print_traits` can mirror discovery data, but it is insufficient as canonical authority because the modifier must participate in canonical identity planning

The needed extension is a bounded printed-identity modifier dimension that can coexist with the existing `cc` classic-collection variant surface instead of forcing `δ` to live only inside name text.

## Next Execution Unit

Exact next lawful execution unit:

- `DELTA_SPECIES_PRINTED_IDENTITY_MODEL_CONTRACT_V1`

That unit should:

- define how delta-species participates in canonical printed identity
- define how it coexists with existing `variant_key`-backed modifiers such as `cc`
- stay model-level first, with no collapse apply work until the contract is explicit

## Result

The final `cel25` gap is fully explained:

- row remains `IDENTITY_MODEL_EXTENSION_REQUIRED`
- collapse is unsafe under the current model
- the blocker is a missing structured delta-species identity dimension, not missing target data
