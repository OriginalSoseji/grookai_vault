# CEL25C_MULTI_ORIGIN_REPRINT_LANE_REPAIR_V1

## Context

- `cel25c` (`Celebrations: Classic Collection`) is a special multi-origin reprint anthology lane.
- Duplicate printed numbers are valid inside this set because cards retain original source-card numbering families.
- Current live state is card-complete but provenance-inconsistent.

## Problem

- `22` rows currently live in the canonical Classic Collection lane with `variant_key = 'cc'` and upstream `pokemonapi`-style provenance.
- `3` legitimate Classic Collection members are present in the set but are not encoded in the same lane model:
  - `Here Comes Team Rocket!`
  - `Rocket's Zapdos`
  - `Claydol`
- At least one `15`-family `pokemonapi` alignment is misassigned:
  - live `external_ids.pokemonapi` on `Venusaur` is `cel25c-15_A3`
  - live `external_mappings` currently attach all `cel25c-15_A1..A4` rows to the `Venusaur` card row

## Rule Lock

- In `cel25c`, `(set_id, number)` is not unique.
- Identity in `cel25c` must be card-level, not number-slot-level.
- All `25` legitimate Classic Collection members in `cel25c` must share a coherent lane encoding.

## Invariants

- Total rows in `cel25c` remain `25`.
- The `25` expected Classic Collection names remain present exactly once.
- No row deletion is allowed unless it is explicitly proven redundant and FK-safe.
- Existing JustTCG mappings must be preserved.
- `pokemonapi` alignment for the `15` family must be corrected.

## CEL25C_MULTI_ORIGIN_REPRINT_RULE_V1

`CEL25C_MULTI_ORIGIN_REPRINT_RULE_V1` is locked for this scoped repair pass.

- `R1.` `cel25c` is a multi-origin reprint anthology set.
- `R2.` Duplicate `number` / `number_plain` values are valid inside this set.
- `R3.` Same-number groups must not be treated as collisions by default.
- `R4.` All legitimate `cel25c` members should share the same provenance lane model.
- `R5.` `variant_key = 'cc'` is the canonical provenance lane marker for Classic Collection rows.
- `R6.` The `15`-family `pokemonapi` ids must align exactly as:
  - `Venusaur -> cel25c-15_A1`
  - `Here Comes Team Rocket! -> cel25c-15_A2`
  - `Rocket's Zapdos -> cel25c-15_A3`
  - `Claydol -> cel25c-15_A4`
- `R7.` Existing downstream references must be preserved or remapped safely.
- `R8.` Repair is scoped to `cel25c` only.

## Pre-Apply Snapshot

- Snapshot artifact: [cel25c_pre_apply_snapshot.json](/c:/grookai_vault/docs/checkpoints/identity/artifacts/cel25c_pre_apply_snapshot.json)
- Target artifact: [cel25c_target_membership_v1.json](/c:/grookai_vault/docs/checkpoints/identity/artifacts/cel25c_target_membership_v1.json)
- Migration draft: [20260415173000_repair_cel25c_multi_origin_reprint_lane_v1.sql](/c:/grookai_vault/supabase/migrations/20260415173000_repair_cel25c_multi_origin_reprint_lane_v1.sql)

## Snapshot SQL

```sql
select
  s.id,
  s.name,
  s.code,
  s.printed_total,
  s.source
from public.sets s
where s.id = '3be64773-d30e-48af-af8c-3563b57e5e4a';
```

```sql
select
  cp.*
from public.card_prints cp
where cp.set_id = '3be64773-d30e-48af-af8c-3563b57e5e4a'
order by cp.name, cp.number, cp.id;
```

```sql
select
  cp.id,
  cp.name,
  cp.number,
  cp.number_plain,
  nullif(btrim(cp.variant_key), '') as variant_key,
  cp.external_ids,
  cp.gv_id,
  cp.print_identity_key
from public.card_prints cp
where cp.set_id = '3be64773-d30e-48af-af8c-3563b57e5e4a'
  and nullif(btrim(cp.variant_key), '') = 'cc'
order by cp.name, cp.number, cp.id;
```

```sql
select
  cp.id,
  cp.name,
  cp.number,
  cp.number_plain,
  nullif(btrim(cp.variant_key), '') as variant_key,
  cp.external_ids,
  cp.gv_id,
  cp.print_identity_key
from public.card_prints cp
where cp.set_id = '3be64773-d30e-48af-af8c-3563b57e5e4a'
  and coalesce(nullif(btrim(cp.variant_key), ''), '∅') <> 'cc'
order by cp.name, cp.number, cp.id;
```

```sql
select
  em.*
from public.external_mappings em
join public.card_prints cp
  on cp.id = em.card_print_id
where cp.set_id = '3be64773-d30e-48af-af8c-3563b57e5e4a'
order by em.source, em.external_id, em.id;
```

```sql
select
  cp.id,
  cp.name,
  cp.number,
  exists (select 1 from public.vault_items v where v.card_id = cp.id) as has_vault_items,
  exists (select 1 from public.external_mappings em where em.card_print_id = cp.id) as has_external_mappings,
  exists (select 1 from public.price_observations po where po.print_id = cp.id) as has_price_observations,
  exists (select 1 from public.card_print_traits t where t.card_print_id = cp.id) as has_traits,
  exists (select 1 from public.card_embeddings e where e.card_print_id = cp.id) as has_embeddings,
  exists (select 1 from public.card_printings p where p.card_print_id = cp.id) as has_printings
from public.card_prints cp
where cp.set_id = '3be64773-d30e-48af-af8c-3563b57e5e4a'
  and coalesce(nullif(btrim(cp.variant_key), ''), '∅') <> 'cc'
order by cp.name, cp.number, cp.id;
```

```sql
select
  cp.id,
  cp.name,
  cp.number,
  cp.number_plain,
  nullif(btrim(cp.variant_key), '') as variant_key,
  cp.external_ids ->> 'pokemonapi' as external_ids_pokemonapi,
  em.id as mapping_id,
  em.source,
  em.external_id,
  em.active
from public.card_prints cp
left join public.external_mappings em
  on em.card_print_id = cp.id
 and em.source = 'pokemonapi'
where cp.set_id = '3be64773-d30e-48af-af8c-3563b57e5e4a'
  and cp.name in ('Venusaur', 'Here Comes Team Rocket!', 'Rocket''s Zapdos', 'Claydol', 'Umbreon ★')
order by cp.name, em.external_id, em.id;
```

## Target Membership

- Deterministic target membership is recorded in [cel25c_target_membership_v1.json](/c:/grookai_vault/docs/checkpoints/identity/artifacts/cel25c_target_membership_v1.json).
- Explicit 15-family target rows:
  - `Venusaur | 15 | cc | cel25c-15_A1`
  - `Here Comes Team Rocket! | 15 | cc | cel25c-15_A2`
  - `Rocket's Zapdos | 15 | cc | cel25c-15_A3`
  - `Claydol | 15 | cc | cel25c-15_A4`
  - `Umbreon ★ | 17 | cc | cel25c-17_A`
- Primary action classes from the target artifact:
  - `Venusaur -> FIX_POKEMONAPI_ID`
  - `Here Comes Team Rocket! -> ADD_CC_LANE_METADATA`
  - `Rocket's Zapdos -> ADD_CC_LANE_METADATA`
  - `Claydol -> ADD_CC_LANE_METADATA`
  - all other current Classic Collection members -> `NO_CHANGE`

## Dry-Run Findings

- Live blocker under current schema:
  - `uq_card_prints_identity_v2` still rejects lawful `cel25c` same-number `cc` coexistence.
  - Projected blocking group if the three rows are normalized without schema change:
    - `Claydol`
    - `Here Comes Team Rocket!`
    - `Rocket's Zapdos`
    - `Venusaur`
  - Shared blocking tuple:
    - `set_id = 3be64773-d30e-48af-af8c-3563b57e5e4a`
    - `number_plain = 15`
    - `printed_identity_modifier = ''`
    - `variant_key = 'cc'`
- Projected target state after scoped repair:
  - row count remains `25`
  - `variant_key = 'cc'` row count becomes `25`
  - duplicate-name groups remain `0`
  - projected V3 duplicate groups remain `0`
  - projected `gv_id` duplicate groups remain `0`
- 15-family target state:
  - `Venusaur -> GV-PK-CEL-15CC -> cel25c:15:venusaur -> cel25c-15_A1`
  - `Here Comes Team Rocket! -> GV-PK-CEL-15CC-HERE-COMES-TEAM-ROCKET -> cel25c:15:here-comes-team-rocket -> cel25c-15_A2`
  - `Rocket's Zapdos -> GV-PK-CEL-15CC-ROCKET-S-ZAPDOS -> cel25c:15:rocket-s-zapdos -> cel25c-15_A3`
  - `Claydol -> GV-PK-CEL-15CC-CLAYDOL -> cel25c:15:claydol -> cel25c-15_A4`
- External mapping dry-run:
  - live `external_ids.pokemonapi` on `Venusaur` is wrong (`cel25c-15_A3`)
  - live `external_mappings` currently attach all `cel25c-15_A1..A4` rows to the `Venusaur` card row
  - `Here Comes Team Rocket!` JustTCG mapping is already anchored to the correct row and must remain there
- Rollback dry-run status:
  - the migration body executed successfully with the final `commit` replaced by `rollback`
  - one draft issue was caught and corrected before apply:
    - `number_plain` is a generated column and cannot be updated directly
    - repair now updates `number` only and lets `number_plain` recompute

## Applied Changes

- Post-apply artifact: [cel25c_post_apply_snapshot.json](/c:/grookai_vault/docs/checkpoints/identity/artifacts/cel25c_post_apply_snapshot.json)
- Applied migrations:
  - [20260415173000_repair_cel25c_multi_origin_reprint_lane_v1.sql](/c:/grookai_vault/supabase/migrations/20260415173000_repair_cel25c_multi_origin_reprint_lane_v1.sql)
  - [20260415174500_repair_cel25c_print_identity_key_set_code_alignment_v1.sql](/c:/grookai_vault/supabase/migrations/20260415174500_repair_cel25c_print_identity_key_set_code_alignment_v1.sql)
- Exact data changes:
  - replaced legacy `uq_card_prints_identity_v2` with `uq_card_prints_identity_v2_non_cel25c` so `cel25c` no longer inherits unlawful number-slot uniqueness while all non-`cel25c` sets keep the old V2 rule
  - normalized the three legitimate Classic Collection rows into the `cc` lane in place:
    - `Here Comes Team Rocket!`
    - `Rocket's Zapdos`
    - `Claydol`
  - corrected `Rocket's Zapdos` and `Claydol` from their synthetic local numbers (`16`, `17`) to the lawful shared Classic Collection family number `15`
  - assigned new deterministic `gv_id` values for the three newly canonicalized same-number rows:
    - `GV-PK-CEL-15CC-HERE-COMES-TEAM-ROCKET`
    - `GV-PK-CEL-15CC-ROCKET-S-ZAPDOS`
    - `GV-PK-CEL-15CC-CLAYDOL`
  - corrected `external_ids.pokemonapi` alignment for the 15-family:
    - `Venusaur -> cel25c-15_A1`
    - `Here Comes Team Rocket! -> cel25c-15_A2`
    - `Rocket's Zapdos -> cel25c-15_A3`
    - `Claydol -> cel25c-15_A4`
  - remapped the existing `external_mappings` `pokemonapi` rows `5491`..`5494` onto the correct `card_print_id` owners instead of deleting/reinserting them
  - preserved the active JustTCG mapping row `93807` on `Here Comes Team Rocket!`
  - populated `print_identity_key` for all `25` `cel25c` rows
  - follow-up alignment migration forced the `print_identity_key` prefix to the canonical set code literal `cel25c` after post-apply proof exposed inherited row-level `set_code` drift (`cel25` / `null`)

### Before / After

| Surface | Before | After |
| --- | --- | --- |
| `cc` lane rows | `22` | `25` |
| `gv_id` rows | `22` | `25` |
| `print_identity_key` rows | `0` | `25` |
| non-`cc` rows in `cel25c` | `3` | `0` |
| 15-family `pokemonapi` owners | all `A1..A4` incorrectly attached to `Venusaur` | correctly split across `Venusaur`, `Here Comes Team Rocket!`, `Rocket's Zapdos`, `Claydol` |
| lawful duplicate `15` rows | blocked by V2 | allowed via `print_identity_key` + `cel25c` carve-out |

## Verification

- `V1. Set remains complete`
  - `total_rows = 25`
- `V2. Name coverage remains correct`
  - all `25` expected Classic Collection names return `row_count = 1`
- `V3. Lane consistency is repaired`
  - `cc_rows = 25`
  - `gv_rows = 25`
  - `print_identity_key_rows = 25`
  - `non_cc_rows_remaining = 0`
- `V4. 15-family alignment is correct`
  - `Venusaur -> cel25c-15_A1`
  - `Here Comes Team Rocket! -> cel25c-15_A2`
  - `Rocket's Zapdos -> cel25c-15_A3`
  - `Claydol -> cel25c-15_A4`
  - `Umbreon ★ -> cel25c-17_A`
- `V5. No invalid same-number assumptions remain in repair logic`
  - the set now lawfully contains four `number_plain = 15` rows, all intact
  - `v3_duplicate_groups_in_set = 0`
- `V6. FK safety preserved`
  - `Here Comes Team Rocket!` JustTCG mapping row `93807` still exists, remains active, and still points to `card_print_id = c267755e-9f4a-4ed5-a6aa-190dd42ae977`
  - `pokemonapi` mapping rows `5491`..`5494` were preserved and reassigned in place to their correct owners
- `V7. No accidental cross-set changes`
  - only one pending migration was pushed at each apply step
  - data mutation predicates were scoped to `set_id = 3be64773-d30e-48af-af8c-3563b57e5e4a`
  - the only non-`card_prints` mutation scope was the four explicit `pokemonapi` external ids for the `cel25c` 15-family

### Proof Highlights

- [cel25c_post_apply_snapshot.json](/c:/grookai_vault/docs/checkpoints/identity/artifacts/cel25c_post_apply_snapshot.json) shows:
  - `counts.total_rows = 25`
  - `counts.cc_rows = 25`
  - `counts.gv_rows = 25`
  - `counts.print_identity_key_rows = 25`
  - all `print_identity_key` values prefixed with `cel25c:`
- The family-alignment proof rows now read:
  - `Claydol -> 15 -> cel25c:15:claydol -> GV-PK-CEL-15CC-CLAYDOL -> cel25c-15_A4`
  - `Here Comes Team Rocket! -> 15 -> cel25c:15:here-comes-team-rocket -> GV-PK-CEL-15CC-HERE-COMES-TEAM-ROCKET -> cel25c-15_A2`
  - `Rocket's Zapdos -> 15 -> cel25c:15:rocket-s-zapdos -> GV-PK-CEL-15CC-ROCKET-S-ZAPDOS -> cel25c-15_A3`
  - `Venusaur -> 15 -> cel25c:15:venusaur -> GV-PK-CEL-15CC -> cel25c-15_A1`
  - `Umbreon ★ -> 17 -> cel25c:17:umbreon-star -> GV-PK-CEL-17CC -> cel25c-17_A`

Explicit note:

- same-number reuse in `cel25c` is lawful
- the set now keeps four distinct `15` rows without collapsing them

## Follow-Up

- TODO: Add `REPRINT_ANTHOLOGY_SET_CONTRACT_V1` to contract index / governance docs.
