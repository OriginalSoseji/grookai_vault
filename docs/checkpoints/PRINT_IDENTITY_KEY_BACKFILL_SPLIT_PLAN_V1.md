# PRINT_IDENTITY_KEY_BACKFILL_SPLIT_PLAN_V1

## Context

The derivation-rule contract is complete and the blocker surface now splits cleanly:

- `blocker_row_count = 1363`
- `derivable_row_count = 31`
- `remaining_blocked_count = 1332`
- `collision_risk = none_for_derivable_subset`

That means global backfill is still unsafe, but a bounded partial backfill is now lawful.

## Derivation Results

The safe derivable subset consists of exactly:

- `29` rows unlocked by `set_id -> sets.code` fallback
- `2` rows unlocked by the bounded legacy `ex10 / Unown` symbolic-variant contract

The blocked remainder consists of:

- `1332` rows with no derivable printed-number surface
- each still blocked because both `number_plain` and `number` are absent

## Safe vs Blocked Split

### SAFE_BACKFILL_LANE

Definition:

- `set_code` resolvable
- `number_plain` present or deterministically derivable
- normalized printed name present
- `variant_key` inside the bounded allowed contract
- no collision risk under the V3 composite identity surface

Live count:

- `31`

Safety proof:

- projected collision groups against the existing non-null `print_identity_key` surface = `0`

### BLOCKED_LANE

Definition:

- no deterministic `number_plain` derivation path
- or unresolved `set_code`
- or identity contract still incomplete

Live count:

- `1332`

Current truth:

- the blocked lane is dominated by numberless canonical surfaces
- it must remain untouched until a separate numberless-surface contract exists

## Execution Plan

Next safe execution unit:

- `PRINT_IDENTITY_KEY_BACKFILL_APPLY_V1`

Scope:

- update only the `31` safe rows
- compute `print_identity_key` in code using the locked derivation rules
- remain idempotent
- preserve all canonical invariants

Next blocked execution unit:

- `PRINT_IDENTITY_KEY_BLOCKED_SURFACE_AUDIT_V1`

Scope:

- analyze the `1332` numberless canonical rows
- define the missing identity / printed-number contract
- perform no mutation

## Safety Guarantees

The split preserves determinism because:

- the safe lane is already collision-free
- the blocked lane is explicitly excluded from apply
- the two lanes do not overlap
- no canonical row outside the `31` safe rows enters future apply scope

What the safe apply must not do:

- no updates outside the `31` row set
- no `gv_id` changes
- no uniqueness-model changes
- no fallback guessing beyond the locked derivation rules

What the blocked lane must not do:

- no partial backfill
- no guessed `number_plain`
- no silent canonical mutation

## Result

The `print_identity_key` backfill is now partitioned into two lawful execution lanes:

- one bounded safe apply lane (`31`)
- one still-blocked audit lane (`1332`)

This keeps deterministic execution intact while unblocking the next concrete apply step.
