# GLOBAL_PRINT_IDENTITY_KEY_DERIVATION_BLOCKER_AUDIT_V1

## Context

The uniqueness transition is complete:

- V3 composite uniqueness is active
- the standalone `print_identity_key` unique index is retired
- canonical row data remains unchanged

Backfill is still blocked by the preflight blocker surface:

- `derivation_input_blocker_count = 1363`

This audit is read-only. No canonical data, `gv_id`, or mapping rows were changed.

## Blocker Breakdown

Audited blocker scope:

- `blocker_row_count = 1363`
- `blockers_with_null_print_identity_key = 1363`
- `blockers_with_existing_print_identity_key = 0`

Important scope clarification:

- this is not the full `print_identity_key is null` surface
- it is only the subset whose derivation inputs are incomplete or malformed
- rows with null `print_identity_key` but complete derivation inputs remain future backfill work, not blocker rows

Final classification counts:

- `MISSING_NUMBER_PLAIN = 1332`
- `MISSING_OR_INVALID_NAME = 0`
- `LEGACY_VARIANT_KEY_SHAPE = 2`
- `PRINTED_IDENTITY_MODIFIER_GAP = 0`
- `SET_CODE_CLASSIFICATION_GAP = 29`
- `OTHER = 0`

Interpretation:

- no row remained unexplained
- the blocker surface reduces to three real lanes

## Grouped Root Causes

Repeated blocker families:

- `NULL_NUMBER_SURFACE_AND_SET_CODE_MIRROR_GAP = 1332`
  - every row in this family is missing both `card_prints.set_code` and `number_plain`
  - all `1332` also have `number = null`
  - this is not a simple normalization problem because there is no printed-number surface to normalize

- `SET_CODE_MIRROR_MISSING_WITH_JOINABLE_SET = 29`
  - these rows already have lawful `number_plain`
  - every row has a joinable authoritative `sets.code`
  - this is a bounded denormalized set-code hydration / normalization lane

- `LEGACY_PUNCTUATION_VARIANT_KEYS = 2`
  - both rows are `ex10 / Unown`
  - `variant_key` values are `!` and `?`
  - current derivation contract rejects punctuation-bearing legacy variant keys

## High-Risk Domains

Domain clustering:

- `ingestion_anomalies = 1125`
  - dominant failure type: `MISSING_NUMBER_PLAIN`
  - this is the main blocker mass: canonical rows with no printed number and therefore no derivable `number_plain`

- `promo_sets = 192`
  - dominant failure type: `MISSING_NUMBER_PLAIN`
  - affected families include `2021swsh`, `me01`, `mep`, and `svp`

- `legacy_sets = 46`
  - dominant failure type: `MISSING_NUMBER_PLAIN`
  - affected families include `ecard2`, `ecard3`, `col1`, `bw11`, and the `ex10` Unown shape rows

- `special_identity_rows = 0`
  - no RC / delta / printed-identity-modifier rows are currently blocking derivation

## Readiness Levels

Readiness split:

- `ready_now_count = 0`
- `requires_normalization_fix_count = 29`
- `requires_contract_count = 1334`
- `requires_manual_review_count = 0`

Why backfill is still unsafe:

- the dominant `1332`-row blocker lane has no printed-number surface at all
- those rows require a derivation contract for numberless canonical surfaces before any authoritative backfill can proceed
- the `2` legacy `variant_key` rows also require rule-level handling, not blind mutation

Why `PRINT_IDENTITY_KEY_BACKFILL_APPLY_V1` is not yet lawful:

- `1334` rows still require contract definition
- `0` blocker rows are ready for immediate derivation

## Next Step Recommendation

Exact next codex type:

- `PRINT_IDENTITY_KEY_DERIVATION_RULES_V1`

Why this is the safest deterministic next step:

- the blocker surface is dominated by contract-level gaps, not normalization-only gaps
- a `PRINT_IDENTITY_KEY_NORMALIZATION_FIX_V1` unit would only clear `29` rows and leave the dominant blocker mass untouched
- a direct backfill apply would fail closed because the derivation contract for numberless canonical rows is still undefined

## Result

The `1363` derivation blockers are fully explained.

The blocker surface is not a mixed ambiguity problem. It is a contract-first problem with one small follow-up normalization lane:

- primary next lane: derivation rules for numberless canonical rows and legacy punctuation-bearing variant keys
- secondary lane after contract definition: bounded `set_code` normalization for the remaining `29` rows
