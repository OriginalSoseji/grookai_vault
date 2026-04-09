# CEL25_SYMBOL_SEMANTICS_CONTRACT_AUDIT_V1

## Context

`cel25` has been reduced to two blocked rows after closing:

- `DUPLICATE_COLLAPSE = 25`
- `BASE_VARIANT_COLLAPSE = 20`

Existing normalization is exhausted. The remaining surface is symbol-bearing and must be audited before any further apply work.

## Per-Row Analysis

### Umbreon Star / 17A

- row: `c2bdbb6f-10de-4a93-abcf-ed3b8837908b`
- source: `Umbreon Star / 17A`
- candidate targets at base token `17`:
  - `46910a9f-597c-4e29-9fbb-3974d74a3e51 / Groudon / GV-PK-CEL-17`
  - `c9c1a789-a686-4541-99b7-ac7d4de7be30 / Umbreon ★ / GV-PK-CEL-17CC`

Semantic difference type:

- textual symbol equivalence
- `Star` vs `★`

Decision:

- classification: `SAFE_BOUNDED_SYMBOL_EQUIVALENCE`
- lawful target: `c9c1a789-a686-4541-99b7-ac7d4de7be30 / GV-PK-CEL-17CC`

Why:

- token `17` alone is unsafe because it also belongs to `Groudon`
- once bounded tail-word `Star -> ★` equivalence is applied, the row maps uniquely to `Umbreon ★`
- the same bounded rule also resolves three live `ex10` rows (`Entei Star`, `Raikou Star`, `Suicune Star`) with zero ambiguity and zero target reuse

### Gardevoir ex / 93A

- row: `f7c22698-daa3-4412-84ef-436fb1fe130f`
- source: `Gardevoir ex / 93A`
- same-base canonical candidate:
  - `b4a42612-945d-419f-a4f4-c64ae5c26d6b / Gardevoir ex δ / GV-PK-CEL-93CC`

Semantic difference type:

- specialty subtype / decorated form equivalence
- bare `ex` vs `ex δ`

Decision:

- classification: `IDENTITY_MODEL_EXTENSION_REQUIRED`
- no lawful target under the current contract

Why:

- `δ` is not punctuation drift; it is a decorated identity marker
- removing `δ` would not just normalize text, it would erase modeled subtype semantics
- the corpus contains `194` canonical `δ` rows across `11` sets, so broad collapse is unsafe

## Safety Audit

### `Star -> ★`

Results:

- `safe_in_cel25_only = true`
- `reusable_outside_cel25 = true`
- `collision_count_if_enabled = 0`
- `ambiguous_target_count_if_enabled = 0`

Proven reuse outside `cel25`:

- `ex10 / Entei Star -> Entei ★`
- `ex10 / Raikou Star -> Raikou ★`
- `ex10 / Suicune Star -> Suicune ★`

Boundary:

- only terminal-word `Star`
- only same-set routing
- only when token or base-token routing yields exactly one canonical target

### `ex -> ex δ`

Results:

- `safe_in_cel25_only = false`
- `reusable_outside_cel25 = false`
- `collision_count_if_enabled = 0`
- `ambiguous_target_count_if_enabled = 0`

Why still unsafe:

- the absence of collisions does not make the rule lawful
- `δ` is a semantic identity marker, not a typography marker
- this surface needs a model decision, not a normalization shortcut

## Contract Decision

Lawful bounded contract exists for only one rule:

- contract name: `STAR_WORD_TAIL_TO_STAR_SYMBOL_EQUIVALENCE_V1`
- scope: `same_set_same_token_star_tail_only`
- allowed rule:
  - treat terminal English `Star` and symbol `★` as equivalent only when same-set token or base-token routing produces one canonical target

Forbidden expansions:

- no generic `Star` normalization
- no mid-string `star` normalization
- no cross-set routing
- no `δ` normalization
- no symbol generalization without unique-target proof

## Forbidden Expansions

This audit does **not** justify:

- global `Star -> ★` replacement across all names
- any `ex -> ex δ` collapse
- any generalized decorated-form stripping
- any cross-set symbolic aliasing

## Next Lawful Execution Unit

Exact next codex to run:

- `CEL25_STAR_SYMBOL_EQUIVALENCE_COLLAPSE_V1`

That unit should resolve only:

- `Umbreon Star / 17A -> Umbreon ★ / GV-PK-CEL-17CC`

Residual follow-up after that:

- `CEL25_DELTA_SPECIES_IDENTITY_MODEL_AUDIT_V1`

## Result

The symbol-semantic boundary is now explicit:

- star-tail equivalence is lawful under a narrow bounded contract
- delta-species equivalence is not normalization and requires a separate identity-model decision
