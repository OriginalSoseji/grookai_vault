# JUSTTCG_CLASSIC_COLLECTION_STALE_MAPPING_CONTRACT_AUDIT_V1

## Context

One stale JustTCG mapping remains outside the Battle Academy subset:

- `pokemon-celebrations-classic-collection-here-comes-team-rocket-classic-collection`

Live correction as of April 12, 2026:

- `cel25c` already exists as a canonical set
- `cel25c` already has `22` canonical rows with non-null `gv_id`

So the blocker is not “create the `cel25c` set.”

The real blocker is narrower:

- this specific Classic Collection card does not yet have a same-set canonical target

## Identity Distinction

Classic Collection rows are not the same as their original-print source cards.

For this row:

- raw name: `Here Comes Team Rocket!`
- raw number: `15/82`
- raw set: `celebrations-classic-collection-pokemon`

Naive matching surfaces:

- `GV-PK-TR-15`
- set: `base5`
- name: `Here Comes Team Rocket!`

That looks plausible only because the original Team Rocket print shares the same card face name and original collector number.

That is not lawful remap behavior.

Why:

- the JustTCG row is aligned to `cel25c`, not `base5`
- Classic Collection is a separate printed identity lane
- cross-set remap would erase the fact that this is the Celebrations reprint, not the original Team Rocket card

## Live Same-Set Evidence

`cel25c` currently contains canonical rows, which proves the set-level lane already exists.

But for this exact identity:

- same-set canonical `Here Comes Team Rocket!` count = `0`
- same-set non-canonical placeholder exists
- same normalized number already has a different canonical `cel25c` row:
  `GV-PK-CEL-15CC / Venusaur`

That means the remaining stale mapping is a missing-card problem inside an existing canonical set, not a missing-set problem.

## Root Cause

Formal root cause:

- `CLASSIC_COLLECTION_SAME_SET_CANONICAL_ABSENT`

Meaning:

- a lawful same-set canonical target is required
- it does not currently exist
- bridge remap must remain blocked until it does

## Contract Rules

1. Classic Collection rows must never map to original source-set canon.
2. Cross-set reuse is prohibited even when name and number agree.
3. Mapping requires same-set canonical existence in `cel25c`.
4. If the Classic Collection set exists but the specific card does not, remap remains blocked.

## Why Remap Is Blocked

Current bridge target:

- non-canonical `cel25c` placeholder

Naive cross-set candidate:

- canonical `base5` Team Rocket original print

Why remap is still unsafe:

- it would convert a Classic Collection reprint into the original Team Rocket card
- it would bypass the same-set canonical requirement
- it would treat cross-set similarity as canonical identity truth

That is unlawful under the identity-first canonical model.

## Required System Evolution

The lawful future path is:

1. keep this JustTCG mapping blocked
2. audit the missing Classic Collection card inside `cel25c`
3. create the missing same-set canonical card
4. only then allow the JustTCG bridge remap

Correct resolution label:

- `classification = PROMOTION_REQUIRED`
- `safe_resolution_type = REQUIRE_NEW_CANONICAL_CARD`
- `required_action = CREATE_MISSING_CLASSIC_COLLECTION_CANONICAL_CARD_FIRST`

## Result

The Classic Collection contract is explicit:

- `classic_collection_row_count = 1`
- `classification = PROMOTION_REQUIRED`
- `canonical_set_exists = yes`
- `remap_allowed = no`

Next lawful execution unit:

- `JUSTTCG_CLASSIC_COLLECTION_MISSING_CANONICAL_CARD_AUDIT_V1`
