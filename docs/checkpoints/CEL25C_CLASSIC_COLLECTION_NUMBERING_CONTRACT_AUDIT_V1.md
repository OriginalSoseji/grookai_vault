# CEL25C_CLASSIC_COLLECTION_NUMBERING_CONTRACT_AUDIT_V1

## Context

The `cel25c` conflict is now proven to be a numbering-model problem, not a missing-row problem.

Live state:

- lawful canonical owner currently occupying the lane:
  - `Venusaur / GV-PK-CEL-15CC`
- blocked candidate:
  - `Here Comes Team Rocket!`
- prior audit result:
  - `NUMBERING_RULE_GAP`

The task in this audit is to define the authoritative numbering contract for Classic Collection when multiple distinct cards share the same printed numerator.

## Numbering Conflict Explanation

The full canonical `cel25c` surface shows `22` canonical rows, all currently modeled with:

- `variant_key = cc`
- `gv_id = GV-PK-CEL-<number>CC`

There are no canonical duplicate `number_plain` values yet, but that is not proof that the numbering contract is complete. It only proves the current canonical set has already been collapsed into one owner per number slot.

The live unresolved duplicate surface inside `cel25c` is:

- `15`
  - `Venusaur` canonical
  - `Here Comes Team Rocket!` placeholder
- `17`
  - `Umbreon ★` canonical
  - `Claydol` placeholder

Upstream JustTCG evidence shows the `15` conflict is a real family, not a bad source row:

- `Venusaur` → `15/102`
- `Here Comes Team Rocket!` → `15/82`
- `Rocket's Zapdos` → `15/132`
- `Claydol` → `15/106`

All four belong to the same aligned set:

- JustTCG set `celebrations-classic-collection-pokemon`
- Grookai set `cel25c`
- mapping `active = true`

So Classic Collection canon contains multiple lawful cards whose printed source numbers all begin with `15`, even though the current canonical lane can represent only one `15CC` row.

## Identity Model Limitation

The prompt’s simplified key:

- `(set_id, number_plain, variant_key)`

is no longer the full live truth.

Current live uniqueness is already stricter:

- `uq_card_prints_identity_v2`
- unique on `(set_id, number_plain, coalesce(printed_identity_modifier,''), coalesce(variant_key,''))`

That still does not solve the Classic Collection conflict because the `15` family shares:

- same `set_id`
- same `number_plain = 15`
- same `variant_key = cc` if modeled canonically
- same blank `printed_identity_modifier`

The database also already has:

- `print_identity_key` column
- `card_prints_print_identity_key_uq` unique index

But in live `cel25c` canon:

- `22 / 22` canonical rows still have `print_identity_key = null`

And the existing backfill worker format in repo is:

- `<set_code>-<number_plain>-<variant|base>`

That format would still collide on the `15` family because all four cards would compress to the same Classic Collection numeric slot if promoted under the current scheme.

## Evaluated Options

### Option A: `SUFFIX_EXPANSION`

Example:

- `15` → Venusaur
- `15a` → Here Comes Team Rocket!

Decision:

- rejected

Why:

- deterministic, but unlawful
- invents fake suffix identity
- violates printed identity precedence

### Option B: `NAME_INCLUSIVE_IDENTITY`

Example:

- `(set_id, number_plain, normalized_name, variant_key)`

Decision:

- rejected

Why:

- preserves printed identity, but pushes normalized text into the global canonical uniqueness key
- too broad for a set-local numbering family issue

### Option C: `PRINT_IDENTITY_KEY_EXTENSION`

Decision:

- selected

Why:

- preserves printed identity truth
- avoids fake suffixes
- aligns with existing repo scaffolding (`print_identity_key` already exists)
- future-proofs same-set same-number families beyond `cel25c`

Important constraint:

- this is not just “turn on the existing backfill”
- the current uniqueness contract and current `<set>-<number>-<variant>` backfill shape are insufficient
- the `print_identity_key` contract must be upgraded and then made authoritative for this numbering family

### Option D: `SPECIAL_SET_CONTRACT`

Decision:

- rejected

Why:

- would localize the fix, but at the cost of introducing exception logic
- does not solve the more general same-set same-number printed identity problem cleanly

## Selected Contract

Selected strategy:

- `PRINT_IDENTITY_KEY_EXTENSION`

Authoritative principle:

- Classic Collection printed identity cannot be reduced to `number_plain` when multiple lawful cards share the same numerator family
- the canonical model needs an explicit printed-identity token that preserves name + set-local card identity without inventing artificial suffixes

This means the limiting surface is a real identity-model gap:

- `identity_model_gap = true`

## System Impact

Required schema change:

- `yes`

Reason:

- the live authoritative unique index `uq_card_prints_identity_v2` would still reject multiple lawful `15` Classic Collection rows
- the system needs a new uniqueness / routing plan that incorporates a strengthened `print_identity_key` contract rather than relying on `(set_id, number_plain, printed_identity_modifier, variant_key)` alone

This is a bounded system evolution, not a one-off repair:

- no canonical inserts yet
- no `gv_id` rewrites yet
- no remaps yet

## Next Execution Unit

Required next action:

- `PLAN_PRINT_IDENTITY_KEY_UNIQUENESS_AND_GVID_RULES`

Exact next execution unit:

- `CEL25C_PRINT_IDENTITY_KEY_SCHEMA_AND_GVID_PLAN_V1`

Why this is the safest deterministic next step:

- it uses the repo’s existing `print_identity_key` foundation instead of inventing a parallel field
- it can define how `print_identity_key` should be derived for Classic Collection same-number families
- it can define the required uniqueness migration and `gv_id` implications before any new canonical rows are created

## Result

The Classic Collection numbering contract is now explicit:

- `conflict_number = 15`
- `conflict_row_count = 4`
- `identity_model_gap = true`
- `selected_contract_strategy = PRINT_IDENTITY_KEY_EXTENSION`
- `required_schema_change = yes`

The next lawful move is no longer another promotion attempt. It is a schema-and-identity planning unit for authoritative `print_identity_key` handling in `cel25c`.
