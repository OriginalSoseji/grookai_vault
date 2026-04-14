# PRINT_IDENTITY_KEY_DERIVATION_RULES_V1

## Context

The derivation-blocker audit reduced the blocker surface to three deterministic families:

- `MISSING_NUMBER_PLAIN = 1332`
- `SET_CODE_CLASSIFICATION_GAP = 29`
- `LEGACY_VARIANT_KEY_SHAPE = 2`

This artifact defines the rule contract only. No canonical rows, `gv_id`, or `print_identity_key` values were changed.

## Blocker Breakdown

Live blocker reality carried into this rule audit:

- `1332` rows are blocked because both `number_plain` and `number` are absent
- `29` rows are blocked only because `card_prints.set_code` is blank while `set_id -> sets.code` remains available
- `2` rows are blocked only because legacy symbolic `variant_key` values fail the current strict shape validator

Key correction:

- the `1332` blocker lane is not recoverable by numeric extraction today
- there is no printed-number surface to parse for those rows

## Derivation Rule Extensions

Base derivation remains unchanged:

```text
print_identity_key =
lower(concat_ws(':',
  set_code,
  number_plain,
  normalized_printed_name_token,
  printed_identity_modifier_if_present
))
```

Extended rule set:

### 1. `set_code` fallback

Resolve `effective_set_code` as:

1. use `card_prints.set_code` when present
2. else use `sets.code` through `card_prints.set_id`
3. else the row remains `DERIVATION_BLOCKED`

Result on live blockers:

- all `29` `SET_CODE_CLASSIFICATION_GAP` rows become derivable under this fallback

### 2. `number_plain` fallback

Resolve `effective_number_plain` as:

1. use existing `number_plain` when present
2. else extract the numeric token from `number` if one exists
3. else use a normalized printed-number token from `number` if the printed number exists but is non-numeric
4. else the row is `NON_DERIVABLE` and remains blocked

Result on live blockers:

- `0` blocker rows benefit from numeric extraction
- `0` blocker rows benefit from printed-number fallback
- all `1332` `MISSING_NUMBER_PLAIN` rows remain blocked because `number` is also null

### 3. Legacy symbolic `variant_key` allowance

`variant_key` remains orthogonal to `print_identity_key`, but derivation readiness must still validate that the V3 identity surface can represent the row safely.

Allowed normalized variant-key shapes:

1. empty string
2. lowercase alphanumeric / underscore keys
3. legacy symbolic keys only when all are true:
   - `joined_set_code = 'ex10'`
   - `name = 'Unown'`
   - `variant_key = number_plain`
   - `number_plain` is nonblank

Result on live blockers:

- both legacy `ex10 / Unown` rows (`!`, `?`) become derivable without mutating the stored variant key

### 4. Printed-identity modifier rule

No change:

- blank modifier remains blank
- `[a-z0-9_]+` remains allowed
- malformed modifiers remain blocked

Live result:

- `0` rows currently require modifier handling

## Deterministic Guarantees

The extended contract is deterministic because:

- `set_code` fallback is anchored to `set_id -> sets.code`
- number derivation uses a fixed priority order
- name normalization remains unchanged
- legacy symbolic `variant_key` handling is bounded to a proven canonical lane
- rows with insufficient inputs are explicitly classified as `NON_DERIVABLE`, not guessed

Idempotence:

- the same row yields the same `effective_set_code`, `effective_number_plain`, normalized name token, and proposed `print_identity_key` on every run

## Failure Conditions

A row remains `DERIVATION_BLOCKED` if any of these remain unresolved:

- no resolvable `set_code`
- no resolvable `number_plain`
- no normalized printed-name token
- variant-key shape outside the bounded allowed contract
- malformed printed-identity modifier

Current live blocked remainder:

- `1332`
- all are blocked on missing printed-number surface

## Readiness Improvement

Live re-evaluation under the extended rules:

- `derivable_row_count = 31`
- `remaining_blocked_count = 1332`
- derivable via `set_id -> sets.code` fallback = `29`
- derivable via legacy symbolic variant contract = `2`

Collision validation:

- duplicate groups inside the newly derivable subset = `0`
- duplicate groups against the existing V3-compatible non-null surface = `0`
- `collision_risk = none_for_derivable_subset`

This means the rule extension is safe for the `31`-row derivable subset, but it does not unlock a full backfill.

## Next Step Recommendation

Exact next execution unit:

- `MIXED_EXECUTION_SPLIT`

Why this is the safest deterministic next step:

- one bounded lane is now derivable and collision-free (`31`)
- the dominant blocker lane (`1332`) still needs a separate contract for numberless canonical surfaces
- a single global backfill apply remains unsafe

Recommended split after this contract:

1. a bounded derivable-subset backfill unit for the `31` rows
2. a numberless-surface contract audit for the remaining `1332`

## Result

The derivation contract is now complete enough to classify every blocker row deterministically:

- `31` are safely derivable under extended rules
- `1332` remain explicitly blocked for a known reason
- no fallback rule requires guesswork
