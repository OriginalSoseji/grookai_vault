# GLOBAL_PRINT_IDENTITY_KEY_MIGRATION_PREFLIGHT_AUDIT_V1

## Context

The global `print_identity_key` migration plan is defined. This preflight is the first executable migration phase.

Locked migration plan:

- `print_identity_key` remains the target identity-extension field
- uniqueness transition must happen before authoritative backfill
- existing `gv_id` values remain grandfathered

This audit is read-only. No schema or data mutation was performed.

## Column / Index State

Live schema reality:

- `public.card_prints.print_identity_key` exists
- type = `text`
- nullable = `YES`
- default = `null`

Live index state governing the migration surface:

- `card_prints_print_identity_key_uq`
  - standalone global unique index on non-null `print_identity_key`
- `uq_card_prints_identity_v2`
  - unique index on `(set_id, number_plain, coalesce(printed_identity_modifier,''), coalesce(variant_key,''))`
- `card_prints_gv_id_uq`
- `card_prints_gv_id_unique_idx`

Important implication:

- the environment is already past “column introduction”
- the next real migration phase is uniqueness transition, not add-column apply

## Duplicate Audits

### Current key

Audited current key:

- `(set_id, number_plain, variant_key)`

Result:

- `current_key_duplicate_group_count = 0`

That means the live database does not currently violate the older number-based identity contract outright.

### Proposed V3 key

Simulated key:

- `(set_id, number_plain, computed_print_identity_key, variant_key)`

Result:

- `proposed_v3_duplicate_group_count = 0`

This proves the planned V3 composite key resolves the known pressure surface without introducing duplicate groups in the simulated projection.

Additional safety proof:

- existing non-null `print_identity_key` rows that would already violate the planned V3 composite key = `0`

That is the reason uniqueness transition is safe to enter now, even though backfill is not yet ready.

## Standalone Unique-Index Risk

The standalone index exists:

- `standalone_print_identity_key_unique_index_exists = yes`

Risk result:

- lawful global duplicate computed-key groups = `16`
- lawful cross-set duplicate groups = `0`
- lawful same-set duplicate groups = `16`

Why this index is unsafe:

- computed `print_identity_key` is orthogonal to `variant_key`
- legitimate same-set variant lanes reuse the same printed identity
- examples already appear in sets like `ecard2`, `xy3`, `xy4`, `xy6`, `xy9`, `xy10`, and `g1`

Therefore:

- `retirement_required_before_backfill = yes`

The standalone global unique index must be retired or relaxed before authoritative backfill can happen.

## Readiness Blockers

Canonical-row derivation readiness:

- canonical row count = `21781`
- missing `set_code` = `1361`
- missing `number_plain` = `1332`
- missing `name` = `0`
- malformed `variant_key` = `2`
- malformed `printed_identity_modifier` = `0`
- total `derivation_input_blocker_count = 1363`

Malformed `variant_key` rows:

- `ex10 / Unown / variant_key = !`
- `ex10 / Unown / variant_key = ?`

Important interpretation:

- these blockers prevent authoritative global backfill right now
- they do **not** prevent uniqueness transition, because the existing non-null `print_identity_key` rows already satisfy the planned composite surface

## High-Risk Domains

### `cel25c`

- row count = `25`
- current-key duplicate groups = `0`
- proposed-V3 duplicate groups = `0`
- blocker count = `3`
- readiness = `blocked`

The blocker is missing `card_prints.set_code` on the unresolved `cel25c` surface.

### same-number conflict families

- row count = `115`
- current-key duplicate groups = `0`
- proposed-V3 duplicate groups = `0`
- blocker count = `7`
- readiness = `blocked`

These families are why the migration exists, but some rows are still missing derivation inputs.

### RC-prefix rows

- row count = `37`
- current-key duplicate groups = `0`
- proposed-V3 duplicate groups = `0`
- readiness = `ready`

### delta-species rows

- row count = `194`
- current-key duplicate groups = `0`
- proposed-V3 duplicate groups = `0`
- readiness = `ready`

### nonblank `printed_identity_modifier` rows

- row count = `194`
- current-key duplicate groups = `0`
- proposed-V3 duplicate groups = `0`
- readiness = `ready`

## Final Decision

Decision fields:

- `column_exists = yes`
- `current_key_duplicate_group_count = 0`
- `proposed_v3_duplicate_group_count = 0`
- `standalone_print_identity_key_unique_index_exists = yes`
- `retirement_required_before_backfill = yes`
- `derivation_input_blocker_count = 1363`
- `safe_to_proceed_to_uniqueness_transition = yes`

Why this is still `yes`:

- uniqueness transition acts on index/constraint topology
- existing non-null `print_identity_key` rows already fit the planned composite surface
- no duplicate groups exist under the proposed V3 simulation
- the main blocker is the current standalone unique index, which is exactly what the transition phase is supposed to address

Why backfill is still blocked afterward:

- `1363` canonical rows still lack safe derivation inputs or shape conformity

## Next Execution Recommendation

Exact next codex type:

- `GLOBAL_PRINT_IDENTITY_KEY_UNIQUENESS_TRANSITION_V1`

Why this is the safest deterministic next step:

- the column already exists
- the proposed V3 composite key simulates cleanly
- the current standalone unique index is proven unsafe
- existing non-null rows are already compatible with the planned composite uniqueness surface

Backfill remains a later phase after transition and after blocker remediation.

## Result

The migration preflight reduces cleanly to a yes/no decision:

- safe to proceed to uniqueness transition = `yes`
- safe to proceed to authoritative backfill = `no` until blocker remediation

The global migration can now move into the uniqueness-transition phase with the risk surface explicitly exposed.
