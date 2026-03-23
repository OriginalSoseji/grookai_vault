# JUSTTCG Mapping Playbook V1

**Status:** Active  
**Purpose:** Deterministic workflow for closing remaining JustTCG mapping gaps in Grookai Vault without re-discovering the same failure layers.

This playbook is for the direct-structure lane implemented in [backend/pricing/promote_justtcg_direct_structure_mapping_v1.mjs](C:/grookai_vault/backend/pricing/promote_justtcg_direct_structure_mapping_v1.mjs). It assumes:
- Grookai canonical identity stays Grookai-owned.
- JustTCG is an external integration surface.
- Writes are fail-closed.
- Fixes happen at the narrowest correct layer.

## 1. Problem Classes

### Set alignment failure
**Symptom**
- `no_set_alignment > 0`
- row logs show `alignment_status: no_set_alignment`

**Example**
- Promo and trainer-kit families before helper rows existed in `public.justtcg_set_mappings`

**Correct fix layer**
- `public.justtcg_set_mappings`
- Do not touch resolver normalization first.

### Query-shape failure
**Symptom**
- `no_candidate_rows > 0`
- aligned set exists
- direct probe shows upstream expects a different number query shape

**Example**
- Short prefixed promo numbers such as `BW04` that required `BW004`
- Unown family probes in `ex10` drove the `buildNumberQueryVariants()` lane

**Correct fix layer**
- `buildNumberQueryVariants(value)`
- Do not widen matching logic before proving retrieval shape.

### Name normalization mismatch
**Symptom**
- candidates exist after set + number filtering
- `ambiguous > 0`
- direct probe shows the same identity with different name shape

**Example**
- `Swablu δ` vs `Swablu (Delta Species)`
- `Unown` vs `Unown (A)`

**Correct fix layer**
- `normalizeCardName(value)` for generic exact-name comparison
- `normalizeNameV2(name)` only for the Delta-specific lane

### Number normalization mismatch
**Symptom**
- aligned set exists
- direct probe returns the card
- worker still lands in `SKIP_NO_CANDIDATE_ROWS`

**Example**
- `A` vs `A/28`
- `?` vs `?/28`

**Correct fix layer**
- `normalizeNumberToken(value)`
- Do not add fuzzy fallback.

### True identity ambiguity
**Symptom**
- `ambiguous > 0`
- multiple real JustTCG rows survive set + number and normalization

**Example**
- `ex13` Deoxys formes before explicit overrides
- prerelease/staff or special-suffix families

**Correct fix layer**
- `public.justtcg_identity_overrides`
- Do not widen resolver logic if multiple real upstream identities exist.

### Upstream coverage gap
**Symptom**
- direct probe on exact aligned set + exact printed number returns `0`
- worker remains `SKIP_NO_CANDIDATE_ROWS`

**Example**
- `ex10` Unown `!` currently probes to `0`
- `ex7` `Mudkip ★` currently probes to `0`

**Correct fix layer**
- None in the worker until upstream evidence changes
- Stop, checkpoint, and move on.

## 2. Proven Working Patterns

### Delta normalization
Established in the direct worker:
- `δ ↔ (Delta Species)`
- bare `Delta Species` is stripped in the Delta-only lane
- embedded collector numbers in names are stripped in the Delta-only lane
  - example: `Dragonair - 42/113 (Delta Species)`

Use this for EX-era Delta families only. Do not widen globally without proof.

### Unown special-number handling
Established in the direct worker:
- query variants:
  - raw letter
  - `A/28`
  - `!/28`
  - `?/28`
- comparison normalization:
  - `A/28 ↔ A`
  - `?/28 ↔ ?`
  - `!/28 ↔ !`
- name normalization:
  - `Unown (A) ↔ Unown`
  - `Unown (?) ↔ Unown`
  - `Unown (!) ↔ Unown`

### Override-class cases
Use `public.justtcg_identity_overrides` for exact, repeatable upstream differences such as:
- formes
- star naming
- special energy names
- suffix families like prerelease / cosmos-holo when exact upstream wording is known

Proven examples:
- `ex13` Deoxys formes
- `Gyarados ★` star naming
- `Delta Rainbow Energy`
- seeded promo overrides such as `Comfey - SWSH242 (Prerelease)`

## 3. Exact Decision Tree

1. Run a dry-run on one set and run `base1` as the control.
2. If `no_set_alignment > 0`:
   - inspect `public.justtcg_set_mappings`
   - add or repair a helper set row only if the set alignment is exact and repeatable
   - rerun the same set before touching any resolver helper
3. If `no_candidate_rows > 0`:
   - run a direct JustTCG probe on the exact set + number
   - if the probe returns a row, fix query shape or number normalization
   - if the probe returns `0`, treat it as an upstream gap unless an override-class exact row can be proven
4. If `ambiguous > 0`:
   - inspect the returned candidate rows
   - if the difference is purely shape drift, fix the narrow normalization layer
   - if multiple true identities remain, use overrides
5. If `exact_match > 0` and the `base1` control is unchanged:
   - run a bounded `--apply` on that set
   - rerun the dry-run to confirm the tail dropped
6. If only one remaining card is left and the direct probe returns `0`:
   - stop
   - record it as an upstream coverage gap
   - move on to the next set

**Stop rule**
- If the control set changes unexpectedly, revert.
- If a patch only moves failures sideways and does not improve the target set, revert.
- If progress is marginal and the tail is clearly upstream-bound, checkpoint and move on.

## 4. Standard Commands

### Dry-run by set
```powershell
cd C:\grookai_vault
node backend\pricing\promote_justtcg_direct_structure_mapping_v1.mjs --dry-run --set-code=ex10 --limit=200
```

### Verbose dry-run by set
```powershell
cd C:\grookai_vault
node backend\pricing\promote_justtcg_direct_structure_mapping_v1.mjs --dry-run --set-code=ex10 --limit=200 --verbose
```

### Timestamped log capture to `temp/`
```powershell
cd C:\grookai_vault
New-Item -ItemType Directory -Force temp | Out-Null
$ts = Get-Date -Format 'yyyyMMdd_HHmmss'
node backend\pricing\promote_justtcg_direct_structure_mapping_v1.mjs --dry-run --set-code=ex10 --limit=200 --verbose *>&1 | Tee-Object -FilePath ("temp\\justtcg_ex10_" + $ts + ".log")
```

### Direct JustTCG probe by set + number
```powershell
cd C:\grookai_vault
node backend\pricing\test_justtcg_set_number_probe_v1.mjs --set-id=unseen-forces-pokemon --number=A
```

### Control run on `base1`
```powershell
cd C:\grookai_vault
node backend\pricing\promote_justtcg_direct_structure_mapping_v1.mjs --dry-run --set-code=base1 --limit=50
```

### Apply by set
```powershell
cd C:\grookai_vault
node backend\pricing\promote_justtcg_direct_structure_mapping_v1.mjs --apply --set-code=ex10 --limit=200
```

## 5. SQL Audit Snippets

### Inspect the helper set-mapping row for one Grookai set code
```sql
select jsm.*
from public.justtcg_set_mappings jsm
join public.sets s
  on s.id = jsm.grookai_set_id
where s.code = 'ex10';
```

### Inspect the `sets` row by code
```sql
select id, code, name
from public.sets
where code = 'ex10';
```

### Inspect `justtcg_set_mappings` columns
```sql
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'justtcg_set_mappings'
order by ordinal_position;
```

### Inspect `sets` columns
```sql
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'sets'
order by ordinal_position;
```

### Deactivate a wrong helper mapping
```sql
update public.justtcg_set_mappings
set active = false,
    notes = coalesce(notes, '{}'::jsonb) || jsonb_build_object(
      'deactivated_by', 'JUSTTCG_MAPPING_PLAYBOOK_V1',
      'reason', 'wrong_set_alignment'
    ),
    updated_at = now()
where grookai_set_id = (
  select id
  from public.sets
  where code = 'ex10'
)
and active = true;
```

### Update an existing helper mapping
```sql
update public.justtcg_set_mappings
set justtcg_set_id = 'unseen-forces-pokemon',
    justtcg_set_name = 'Unseen Forces',
    alignment_status = 'manual_helper_override',
    match_method = 'manual_family_override',
    notes = coalesce(notes, '{}'::jsonb) || jsonb_build_object(
      'updated_by', 'JUSTTCG_MAPPING_PLAYBOOK_V1',
      'reason', 'manual helper correction'
    ),
    active = true,
    updated_at = now()
where grookai_set_id = (
  select id
  from public.sets
  where code = 'ex10'
);
```

### Insert or update an identity override row
```sql
insert into public.justtcg_identity_overrides (
  card_print_id,
  justtcg_set_id,
  justtcg_number,
  justtcg_name,
  justtcg_rarity,
  reason,
  notes,
  active
)
select
  cp.id,
  'holon-phantoms-pokemon',
  '3',
  'Deoxys (Delta Species - Attack Forme)',
  'Holo Rare',
  'Exact upstream forme naming differs; deterministic override required.',
  jsonb_build_object(
    'playbook', 'JUSTTCG_MAPPING_PLAYBOOK_V1'
  ),
  true
from public.card_prints cp
where cp.gv_id = 'GV-PK-HP-3'
on conflict (card_print_id) do update
set
  justtcg_set_id = excluded.justtcg_set_id,
  justtcg_number = excluded.justtcg_number,
  justtcg_name = excluded.justtcg_name,
  justtcg_rarity = excluded.justtcg_rarity,
  reason = excluded.reason,
  notes = excluded.notes,
  active = excluded.active,
  updated_at = now();
```

## 6. Closed Case Studies

### ex11 — Delta Species
**Symptom**
- EX-era Delta naming drift and embedded collector-number drift caused false ambiguity.

**Fix**
- Delta-only normalization:
  - `δ ↔ (Delta Species)`
  - embedded collector-number stripping in `normalizeNameV2()`

**Outcome**
- Closed.
- Current dry-run: `inspected: 0`

### ex13 — Holon Phantoms
**Symptom**
- Delta drift plus true identity collisions on Deoxys formes and special-name rows.

**Fix**
- Delta-only normalization
- embedded collector-number stripping
- 6 explicit `justtcg_identity_overrides`

**Outcome**
- Closed.
- Current dry-run: `inspected: 0`

### ex10 — Unseen Forces
**Symptom**
- Unown rows failed on both number shape and name shape.

**Fix**
- Unown query variants
- `A/28 ↔ A`, `?/28 ↔ ?`, `!/28 ↔ !` comparison normalization
- `Unown (A) ↔ Unown` comparison normalization

**Outcome**
- Closed to `27/28`.
- Current dry-run:
  - `no_candidate_rows: 1`
  - `exact_match: 27`
  - `ambiguous: 0`
- Remaining `!` is treated as an upstream gap until probe evidence changes.

### ex12 — Legend Maker
**Symptom**
- None in the remaining tail.

**Fix**
- No work required.

**Outcome**
- Closed.
- Current dry-run: `inspected: 0`

### ex8 — Deoxys
**Symptom**
- Small EX-era tail with special-name rows:
  - `GV-PK-DX-107` `Rayquaza ★`
  - `GV-PK-DX-98` `Deoxys ex`
- Current dry-run lands in `SKIP_NO_CANDIDATE_ROWS`.

**Fix**
- Not solved yet.
- Treat as the next override/probe class only if exact upstream rows can be proven.

**Outcome**
- Still open.
- Keep this as the first resume target.

## 7. Resume Queue

1. `ex8`
   - probe the remaining rows
   - close via overrides only if exact upstream rows are proven
2. `ex7`
   - investigate `Mudkip ★`
   - likely star-name or upstream-gap case
3. Continue the remaining EX-era tail after that

## 8. Core Rules

- Audit first.
- Single-step progression.
- No schema guessing.
- Fix the correct layer only.
- Do not widen resolver logic when override is the correct tool.
- If progress is marginal, stop and checkpoint.
