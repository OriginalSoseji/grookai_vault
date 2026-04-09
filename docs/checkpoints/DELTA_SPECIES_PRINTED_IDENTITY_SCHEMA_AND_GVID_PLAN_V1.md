# DELTA_SPECIES_PRINTED_IDENTITY_SCHEMA_AND_GVID_PLAN_V1

## Context

The delta-species printed-identity contract is defined, but not implemented.

Current contract target:

- `public.card_prints.printed_identity_modifier text null`
- allowed values: `null | 'delta_species'`
- canonical identity target shape:
  - `(set_id, number_plain, printed_identity_modifier, variant_key)`

This step is design-only:

- no schema mutation
- no data mutation
- no `gv_id` rewrites
- no resolver code changes

## Live Baseline

### Current `card_prints` schema enforcement

Live `card_prints` currently shows:

- PK: `card_prints_pkey`
- FK: `card_prints_game_id_fkey`
- FK: `card_prints_set_id_fkey`
- no live identity uniqueness constraint on `(set_id, number_plain, variant_key)` in the current database

Relevant live indexes:

- `card_prints_set_id_idx`
- `card_prints_set_code_number_plain_idx`
- `idx_card_prints_set_no`
- `idx_card_prints_setnumplain`
- `card_prints_gv_id_unique_idx`
- `card_prints_gv_id_uq`
- `card_prints_print_identity_key_uq`

Important implication:

- the repo contract still treats `(set_id, number_plain, variant_key)` as canonical identity
- the live database currently lacks a matching live unique identity index
- therefore the delta-species rollout should be additive: create the new identity uniqueness enforcement rather than assume a legacy index is already present

### Dependency inventory

Objects referencing `card_prints` plus current identity fields:

- functions: `6`
- views: `9`
- matviews: `0`
- policies: `0`

Named dependency inventory:

- functions:
  - `public_vault_instance_detail_v1`
  - `search_card_prints_v1`
  - `vault_add_card_instance_v1`
  - `vault_add_or_increment`
  - `vault_mobile_collector_rows_v1`
  - `vault_mobile_instance_detail_v1`
- views:
  - `card_print_active_prices`
  - `card_prints_clean`
  - `v_card_prints_canon`
  - `v_card_prints_noncanon`
  - `v_card_prints_web_v1`
  - `v_card_stream_v1`
  - `v_special_set_code_forks`
  - `v_special_set_print_membership`
  - `v_vault_items`

These objects do not get changed in this step, but they define the review surface for implementation.

### Delta-species corpus baseline

Live candidate delta rows:

- total candidate delta rows: `194`
- canonical candidate delta rows: `194`
- unresolved candidate delta rows: `0`
- delta set count: `11`

Important live fact:

- `193 / 194` canonical delta rows currently have blank `variant_key`
- only `1` canonical delta row currently has nonblank `variant_key`
- that row is the `cel25` Classic Collection target:
  - `Gardevoir ex δ / GV-PK-CEL-93CC / variant_key = cc`

This is the row that proves delta-species must coexist with another canonical identity dimension.

## Schema Target

Target column:

```sql
public.card_prints.printed_identity_modifier text null
```

Initial allowed values:

- `null`
- `'delta_species'`

This field is orthogonal to `variant_key`.

It does not replace `variant_key`.

## Uniqueness Migration Plan

### Preflight

Live preflight duplicate audits returned:

- duplicate groups under current contract key: `0`
- duplicate groups under proposed computed key: `0`

That means the dataset is currently clean enough to support additive uniqueness rollout.

### Recommended uniqueness strategy

Use a partial expression unique index:

```sql
create unique index concurrently uq_card_prints_identity_v2
  on public.card_prints (
    set_id,
    number_plain,
    coalesce(printed_identity_modifier, ''),
    coalesce(variant_key, '')
  )
  where set_id is not null
    and number_plain is not null;
```

Why this shape:

- keeps the repo-grounded identity anchored on `set_id` and `number_plain`
- preserves `variant_key` as an orthogonal canonical delta
- avoids PostgreSQL nullable-`UNIQUE` loopholes by using `coalesce(printed_identity_modifier, '')`
- respects the production rule that canonical rows should have `set_id` and `number_plain`

### Migration sequence

1. Add nullable `printed_identity_modifier`.
2. Backfill only explicitly proven delta-species rows.
3. Re-run duplicate preflight under both old and proposed keys.
4. Create `uq_card_prints_identity_v2` concurrently.
5. Update writers/readers that currently assume the three-part key.
6. Only after v2 is validated, retire any legacy identity uniqueness artifact if it exists in a target environment.

### Rollback posture

- if backfill or v2 index creation fails, leave the new column nullable and unused by writers
- do not rewrite `gv_id` values in the same rollback boundary
- do not mutate canonical data until uniqueness preflight is clean

## Backfill Plan

### Proof rule

Set `printed_identity_modifier = 'delta_species'` only when the printed surface explicitly proves delta-species:

- name contains `δ`
- or name contains explicit printed `Delta Species`

Do not infer from:

- set
- Pokémon typing
- external APIs
- family knowledge

### Candidate discovery

Primary candidate query:

- `name like '%δ%'`
- or `name ~* '\bdelta species\b'`

### Manual-review lane

Rows mentioning `delta` without explicit printed proof remain review-only.

### `cel25` case handling

`Gardevoir ex / 93A` remains unresolved until:

1. `printed_identity_modifier` exists
2. canonical `Gardevoir ex δ / GV-PK-CEL-93CC` is structurally modeled as:
   - `printed_identity_modifier = 'delta_species'`
   - `variant_key = 'cc'`
3. the identity planners can distinguish:
   - base `Gardevoir ex`
   - delta-species `Gardevoir ex δ`
   - classic-collection delta-species `Gardevoir ex δ` with `variant_key = 'cc'`

Only after that can the final `cel25` row be resolved lawfully.

## GV-ID Plan

### Options evaluated

Option A:

- embed explicit modifier token in `gv_id`
- example:
  - `GV-PK-SET-93-DELTA`
  - `GV-PK-SET-93-DELTA-CC`
- decision: recommended

Option B:

- keep an opaque sequence / rely only on DB uniqueness
- decision: rejected
- reason: violates current human-readable `gv_id` contract

Option C:

- encode delta-species as pseudo-number style
- examples like `93D` / `93A`-style reuse
- decision: rejected
- reason: collides with printed-number and suffix lanes

### Recommended direction

Recommended strategy:

- `explicit_modifier_token_grandfather_existing_non_null_gvids`

Builder rule for future assignments:

- base delta row:
  - `GV-PK-{SET}-{NUMBER}-DELTA`
- delta row with variant key:
  - `GV-PK-{SET}-{NUMBER}-DELTA-{VARIANT_SUFFIX}`

Rollout boundary:

- existing non-null `gv_id` rows are preserved in the initial schema rollout
- delta-aware `gv_id` generation applies to newly created rows or rows assigned after the field exists
- if legacy delta `gv_id` realignment is desired later, it must be a separate route-compatibility execution unit

This keeps the first implementation bounded and replay-safe while still defining the long-term deterministic builder policy.

## Resolver / Search Impact Plan

Future resolver/search work must:

- treat base and delta rows as separate canonical entries
- never rewrite `ex δ` to `ex`
- never strip `δ` during canonical match planning
- allow explicit delta-aware ranking without flattening into the base card

No resolver code changes are included in this step.

## `cel25` Final Row Resolution Dependency Chain

Residual row:

- `f7c22698-daa3-4412-84ef-436fb1fe130f / Gardevoir ex / 93A`

Same-set canonical target:

- `b4a42612-945d-419f-a4f4-c64ae5c26d6b / Gardevoir ex δ / GV-PK-CEL-93CC`

What must exist first:

1. `printed_identity_modifier` column
2. explicit delta-species backfill for canonical target rows
3. new identity uniqueness enforcement
4. delta-aware writer/reader support

Why it cannot be executed before schema change:

- current model cannot express both `delta_species` and `variant_key='cc'` as separate canonical identity dimensions
- collapsing before schema support would still erase the identity-bearing `δ` modifier

What the future row-level resolution will look like:

- the canonical target remains the same `card_prints` row
- that target becomes structurally modeled as `delta_species + cc`
- the unresolved source row can then be audited against a lawful target that is no longer name-text-only

## Verification Plan

Implementation must prove all of:

1. `printed_identity_modifier` column exists
2. allowed values are constrained to `null | delta_species`
3. duplicate preflight under the proposed key returns `0`
4. `uq_card_prints_identity_v2` exists and validates cleanly
5. delta rows remain distinct from base rows
6. delta-aware `gv_id` generation is deterministic for new/null-`gv_id` rows
7. the final `cel25` row becomes lawfully resolvable only after the above gates pass

## Risks / Forbidden Shortcuts

Forbidden:

- collapsing delta into base identity
- storing delta in `variant_key`
- storing delta only in traits JSON
- inferring delta from non-printed signals
- rewriting all historical delta `gv_id` values in the initial schema rollout

Primary risk:

- implementing the field without enforcing the new key shape would create silent identity drift rather than fixing it

## Result

The schema path is fully designed:

- column target is defined
- uniqueness strategy is deterministic
- backfill proof rules are strict
- `gv_id` policy is chosen and bounded
- the remaining `cel25` row now has a lawful implementation dependency chain
