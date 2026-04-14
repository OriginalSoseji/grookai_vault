# CEL25C_PRINT_IDENTITY_KEY_SCHEMA_AND_GVID_PLAN_V1

## Context

`cel25c` exposed a real identity-model gap:

- multiple lawful Classic Collection cards share the same printed numerator family
- artificial suffixing is forbidden
- current number-based uniqueness is insufficient

Locked audit baseline:

- `conflict_number = 15`
- `conflict_row_count = 4`
- `identity_model_gap = true`
- `selected_contract_strategy = PRINT_IDENTITY_KEY_EXTENSION`

This step is plan-only. No schema or data mutation was performed.

## Problem

The current authoritative uniqueness path is not sufficient for same-number printed identities.

Live facts:

- `cel25c` currently has duplicate-number conflict surfaces at:
  - `15` → `Venusaur`, `Here Comes Team Rocket!`
  - `17` → `Umbreon ★`, `Claydol`
- upstream JustTCG evidence for the `15` family is larger:
  - `Venusaur` → `15/102`
  - `Here Comes Team Rocket!` → `15/82`
  - `Rocket's Zapdos` → `15/132`
  - `Claydol` → `15/106`

So the issue is not one bad row. The issue is that Classic Collection can contain multiple lawful cards whose source numbering collapses to the same numerator.

## Evaluated Schema Strategy

Selected strategy:

- `PRINT_IDENTITY_KEY_EXTENSION`

Planned definition:

- `print_identity_key = lower(concat_ws(':', set_code, number_plain, normalized_printed_name_token, printed_identity_modifier_if_present))`

Deterministic inputs:

- `set_code`
- `number_plain`
- normalized printed-name token
  - name normalization preserving identity-bearing symbols
  - `δ -> delta`
  - `★ -> star`
  - punctuation collapse / slugging
- `printed_identity_modifier` when nonblank

Why this is required:

- the key is derived from printed identity rather than row order
- it can distinguish same-set same-number cards without inventing fake suffixes
- it stays orthogonal to `variant_key`

Why suffixing is forbidden:

- `15a`, `15b`, etc. would create synthetic identity rather than modeling the printed card surface

## Uniqueness Plan

The current live database already has:

- `uq_card_prints_identity_v2`
- unique on `(set_id, number_plain, coalesce(printed_identity_modifier,''), coalesce(variant_key,''))`

That still cannot represent the `cel25c` conflict family because same-number Classic Collection cards share:

- same `set_id`
- same `number_plain`
- same `variant_key = cc` when canonically modeled
- blank `printed_identity_modifier`

Planned uniqueness strategy:

- `COMPOSITE_IDENTITY_V3_ON_(set_id,number_plain,print_identity_key,variant_key)_AND_RETIRE_GLOBAL_print_identity_key_UQ`

Key audit results:

- `planned_key_duplicate_group_count = 0` for the audited `cel25c` conflict families
- `broader_composite_duplicate_group_count = 0` under the proposed composite key

Critical global finding:

- the existing standalone `card_prints_print_identity_key_uq` global unique index is incompatible with the new role of `print_identity_key`
- under the planned derivation, there are `16` legitimate duplicate groups globally if `print_identity_key` remains globally unique by itself
- those duplicates come from lawful variant lanes in other sets such as `ecard2`, `xy3`, `xy4`, `xy6`, `xy9`, `xy10`, and `g1`

That means the schema change is not just “populate the column.” It also requires changing which constraint treats `print_identity_key` as authoritative.

## Backfill Plan

Current live state:

- `2032` rows already have non-null `print_identity_key`
- `cel25c` canonical rows still have `print_identity_key = null`
- existing populated keys are mixed legacy formats, for example:
  - `SV02-207`
  - `sv04:142/182`
  - `WHT-075`

Conclusion:

- existing non-null `print_identity_key` values cannot be treated as a single authoritative contract
- migration preflight must recompute or validate them deterministically

Selected backfill approach:

- recompute `print_identity_key` from printed identity inputs
- do not trust current mixed-format values as canonical truth
- review exceptions where regenerated keys would differ from legacy values

Manual review:

- `yes`

Reason:

- the legacy population is mixed-format
- the current standalone global unique index would block legitimate reuse across variant lanes

## GV-ID Plan

Selected GV-ID strategy:

- `GRANDFATHER_EXISTING_EXTEND_NEW_CONFLICT_ROWS_WITH_PRINT_IDENTITY_TOKEN`

Option decision:

- keep lawful existing GV-IDs unchanged where there is no ambiguity to resolve
- for future same-number conflicting rows, extend the current number-based GV-ID with a deterministic print-identity token

Planned future rule:

- base lawful existing row remains:
  - `GV-PK-CEL-15CC` stays `Venusaur`
- new same-number conflict row pattern:
  - `GV-PK-CEL-<number>CC-<print_identity_token>`

Why this was selected:

- preserves backward compatibility
- avoids unnecessary rewrite of existing lawful rows
- gives future conflicting rows readable, deterministic disambiguation

Rejected alternatives:

- rewriting all existing conflicting GV-IDs
  - too much blast radius
- keeping GV-ID number-only while relying only on internal `print_identity_key`
  - operationally confusing and too opaque

## System Impact

### Schema impact

- replace `uq_card_prints_identity_v2` as the authoritative uniqueness contract with a v3 composite key using `print_identity_key`
- retire or relax `card_prints_print_identity_key_uq` from global uniqueness authority

### Ingestion impact

- warehouse / ingestion workers already touch `print_identity_key`
- they must switch to the new deterministic derivation
- they must stop assuming current legacy `print_identity_key` values are authoritative

### Mapping impact

- future promotion and remap logic must use `print_identity_key` whenever same-set same-number collisions exist

### Pricing impact

- pricing remains mostly `card_print_id` based
- but integrity checks and any code assuming standalone global `print_identity_key` uniqueness must be updated

### UI impact

- GV-ID and `card_print_id` should remain the routing authorities
- `set_code + number` displays may need conflict-aware labels once same-number rows coexist canonically in one set

## Next Execution Recommendation

Exact next execution unit:

- `GLOBAL_PRINT_IDENTITY_KEY_MIGRATION_PLAN_V1`

Why global instead of a bounded `cel25c` preflight:

- the planned `print_identity_key` derivation creates `16` legitimate duplicate groups globally if the existing standalone unique index remains in force
- `2032` rows already carry mixed-format legacy `print_identity_key` values
- the blast radius is therefore larger than `cel25c` alone

The next lawful move is a global migration plan that:

1. inventories current `print_identity_key` usage
2. plans the replacement of standalone uniqueness with composite uniqueness
3. defines bounded rollout order before any `cel25c` canonical inserts or GV-ID extensions occur

## Result

The same-number Classic Collection conflict is now translated into a deterministic schema and GV-ID plan:

- `conflict_surface_count = 4`
- `selected_uniqueness_strategy = COMPOSITE_IDENTITY_V3_ON_(set_id,number_plain,print_identity_key,variant_key)_AND_RETIRE_GLOBAL_print_identity_key_UQ`
- `selected_gvid_strategy = GRANDFATHER_EXISTING_EXTEND_NEW_CONFLICT_ROWS_WITH_PRINT_IDENTITY_TOKEN`
- `existing_gvids_grandfathered = yes`
- `required_schema_change = yes`

The next lawful step is global migration planning, not local promotion apply.
