# GLOBAL_PRINT_IDENTITY_KEY_MIGRATION_PLAN_V1

## Context

`cel25c` proved that Grookai’s current identity model cannot represent every lawful printed identity with number-only uniqueness.

Locked inputs:

- `identity_model_gap = true`
- `conflict_surface_count = 4`
- selected uniqueness target:
  - `(set_id, number_plain, print_identity_key, variant_key)`
- selected GV-ID strategy:
  - `GRANDFATHER_EXISTING_EXTEND_NEW_CONFLICT_ROWS_WITH_PRINT_IDENTITY_TOKEN`

The canonical layer is closed and must remain stable. This step defines the migration path only.

## Problem

The migration is not simply “add a column and backfill”.

Live reality:

- `print_identity_key` already exists on `public.card_prints`
- the live database already has a standalone global unique index:
  - `card_prints_print_identity_key_uq`
- `uq_card_prints_identity_v2` also exists on:
  - `(set_id, number_plain, coalesce(printed_identity_modifier,''), coalesce(variant_key,''))`

Global backfill audit results:

- projected rows: `22277`
- current null `print_identity_key`: `20245`
- current non-null `print_identity_key`: `2032`
- current non-null keys matching the planned derivation: `0`
- current non-null keys differing from the planned derivation: `2032`

This means all existing populated `print_identity_key` values are legacy-format values under a different contract.

## Decision

Use `print_identity_key` as the new printed-identity dimension, but change how it is derived and how it is enforced.

Planned derivation:

```text
print_identity_key =
lower(concat_ws(':',
  set_code,
  number_plain,
  normalized_printed_name_token,
  printed_identity_modifier_if_present
))
```

Properties:

- deterministic
- idempotent
- no randomness
- no ordering dependency
- derived from printed identity only

## Schema Plan

Authoritative column definition:

- `public.card_prints.print_identity_key text null`

Important correction:

- the column already exists live
- future schema work must therefore be `VERIFY OR ADD COLUMN`, not blind add-column apply

Rollout rule:

- nullable initially
- no default
- no immediate not-null enforcement

## Backfill Plan

Backfill strategy:

- `compute-only audit -> dry-run diff validation -> controlled apply after uniqueness transition`

Rules:

1. Compute planned `print_identity_key` for every row in scope.
2. Mutate only `print_identity_key`.
3. Log:
   - null → planned value
   - legacy populated value → planned value
   - any projected collision surfaces

Why this must be staged:

- `2032` non-null legacy keys already exist
- all `2032` differ from the planned derivation
- examples show multiple old formats now coexist:
  - `MEG-002`
  - `sv04:142/182`
  - `WHT-075`

Manual review:

- `yes`

Reason:

- current populated values are mixed legacy shapes
- migration must distinguish authoritative recomputation from legacy carry-forward

## Uniqueness Transition

Current authoritative uniqueness is not enough:

- current live identity v2 still cannot represent same-set same-number printed-identity conflicts like `cel25c`

Target uniqueness:

- composite identity v3 on:
  - `(set_id, number_plain, print_identity_key, variant_key)`

Critical precheck result:

- projected duplicate groups under planned composite key: `0`

Critical global blocker:

- projected duplicate groups under standalone global `print_identity_key` uniqueness: `16`

Meaning:

- `print_identity_key` cannot remain globally unique by itself under the new contract
- the standalone index `card_prints_print_identity_key_uq` must be retired or relaxed before authoritative backfill

Transition plan:

1. Preflight projected duplicates and legacy diffs.
2. Build v3 composite uniqueness support.
3. Validate the new composite key cleanly.
4. Retire standalone `card_prints_print_identity_key_uq` as the authoritative global uniqueness constraint.
5. Only then run backfill apply.
6. Re-audit duplicate groups after backfill.

## GV-ID Plan

GV-ID rule:

- existing non-null `gv_id` values are grandfathered
- no historical GV-ID rewrite is required in the initial migration
- future same-number conflicting rows receive a deterministic extended GV-ID using a print-identity-derived token

Illustrative future shape:

- `GV-PK-CEL-15CC-<token>`

This preserves lawful current rows such as:

- `GV-PK-CEL-15CC` for `Venusaur`

while giving future conflicting rows readable disambiguation without destabilizing current canon.

## System Impact

### Ingestion matcher

- must compute planned `print_identity_key` before canonical routing when same-number collisions exist

### Promotion logic

- must compute `print_identity_key` before insert
- must validate uniqueness against the v3 composite key

### External mappings

- unaffected directly by the schema rollout
- later remap/canonical creation steps must become `print_identity_key`-aware

### Pricing

- mostly unaffected because joins are card-print based
- validators relying on standalone global `print_identity_key` uniqueness must be updated

### UI

- routing should continue preferring `gv_id` or `card_print_id`
- same-number conflict displays may need clearer identity-aware labels later

## Invariants

The migration must preserve all of:

- no `gv_id` changes
- no canonical row deletion
- no identity reassignment
- deterministic replayability
- rollback ability before backfill and before any later conflict-row insertions

## Migration Phase Split

Future execution must remain split:

1. `PRE-FLIGHT AUDIT`
   - projected keys, duplicate audit, legacy key diff inventory
2. `SCHEMA VERIFY OR ADD COLUMN`
   - no-op in live env if already present
3. `UNIQUENESS TRANSITION`
   - prepare v3 composite uniqueness and retire standalone print-identity uniqueness
4. `BACKFILL APPLY`
   - write planned values only after uniqueness transition
5. `POST-BACKFILL VALIDATION`
   - verify zero composite collisions, no GV-ID changes, and downstream readiness

## Why This Matters

The `cel25c` conflict is only the first proven example.

Without this migration:

- same-number printed identities cannot coexist canonically
- future promotions will either stay blocked or require unlawful synthetic suffixing
- `print_identity_key` remains a mixed legacy helper rather than an authoritative identity dimension

With this migration:

- printed identity precedence becomes structurally enforceable
- existing lawful canon stays stable
- future conflict-set promotions gain a deterministic path

## Result

The migration path is now explicit:

- `column_definition = public.card_prints.print_identity_key text null (already present live; verify-or-add only for target envs missing it)`
- `derivation_function = lower(concat_ws(':', set_code, number_plain, normalized_printed_name_token, printed_identity_modifier_if_present))`
- `backfill_strategy = compute-only audit -> dry-run diff validation -> controlled apply after uniqueness transition`
- `safe_to_proceed_to_preflight = yes`

The next lawful step is migration preflight, not schema apply.
