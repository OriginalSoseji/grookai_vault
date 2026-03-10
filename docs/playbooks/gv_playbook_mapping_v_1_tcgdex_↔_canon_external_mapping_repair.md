# GV_PLAYBOOK_MAPPING_V1 — TCGdex ↔ Canon External Mapping Repair

> **Purpose**: Deterministic, replayable, audit-first playbook to close `external_mappings(source='tcgdex')` coverage across all sets **without mapping to duplicates** and without guessing.

> **Scope**: Mapping + identity routing only. **No canonical print creation** (that’s Option B / Canonical Completion). **No pricing logic changes**.

> **Core rule**: **Raw → Mapping → Canon** must be deterministic:
- `raw_imports.payload->_external_id` is the tcgdex card key.
- Canon ownership is `external_mappings(source='tcgdex', external_id)` → `card_prints.id`.
- If canon print doesn’t exist, we do **not** guess; we classify as Canon Gap.

---

## 0) Required Contracts

### 0.1 STOP Rules (Hard)
Stop immediately if any of these occur:
- Any join requires guessing (no deterministic key).
- Any identity merge candidate has high-risk references (vault/pricing/identity selections).
- Any set has `mapped_rows_pointing_at_dupe > 0`.
- Any set has duplicate identity lanes (padding / namespace collisions) and we haven’t repaired identity first.

### 0.2 “Printed Identity is Immutable” Rule
When in doubt about identity/numbering/variant: verify directly on the card (prefer graded slabs online). Printed identity wins.

---

## 1) Glossary

- **TCGdex Raw**: `public.raw_imports` row where `source='tcgdex'` and `payload->_kind='card'`.
- **TCGdex Card ID**: `payload->_external_id` (e.g., `sv10-003`, `ecard2-H07`).
- **TCGdex Set Code**: `payload->_set_external_id` (or `payload->set_external_id`).
- **Canonical Print**: `public.card_prints` row.
- **Bridge**: `public.external_mappings(source='tcgdex', external_id)`.
- **Alias Routing**: `public.set_code_classification` row: `set_code` (alias) → `canonical_set_code`.

---

## 2) Fast Audit Scoreboards (Run First)

### 2.1 Global coverage summary
```sql
WITH raws AS (
  SELECT (payload->>'_external_id') AS external_id
  FROM public.raw_imports
  WHERE source = 'tcgdex' AND payload->>'_kind' = 'card'
)
SELECT
  COUNT(*) AS raw_cards,
  COUNT(*) FILTER (WHERE em.external_id IS NOT NULL) AS mapped,
  COUNT(*) FILTER (WHERE em.external_id IS NULL) AS still_missing
FROM raws r
LEFT JOIN public.external_mappings em
  ON em.source = 'tcgdex'
 AND em.external_id = r.external_id;
```

### 2.2 Per-set scoreboard + duplicate tripwires (critical)
```sql
WITH tcgdex_raws AS (
  SELECT
    COALESCE(payload->>'_set_external_id', payload->>'set_external_id') AS set_code,
    (payload->>'_external_id') AS external_id
  FROM public.raw_imports
  WHERE source='tcgdex' AND payload->>'_kind'='card'
),
mapped AS (
  SELECT r.set_code, r.external_id, em.card_print_id
  FROM tcgdex_raws r
  LEFT JOIN public.external_mappings em
    ON em.source='tcgdex' AND em.external_id=r.external_id
),
canonical_counts AS (
  SELECT s.code AS set_code, COUNT(*) AS canonical_prints
  FROM public.card_prints cp
  JOIN public.sets s ON s.id = cp.set_id
  GROUP BY s.code
),
-- numeric-equivalent dupes inside canonical per set
-- NOTE: this detects padding dupes for purely numeric number_plain
-- It does NOT handle prefix namespaces (Hxx) because number_plain preserves them.
dup_ids AS (
  SELECT s.code AS set_code, cp.id AS card_print_id
  FROM public.card_prints cp
  JOIN public.sets s ON s.id = cp.set_id
  WHERE cp.number_plain ~ '^\d+$'
    AND EXISTS (
      SELECT 1
      FROM public.card_prints cp2
      WHERE cp2.set_id = cp.set_id
        AND COALESCE(cp2.variant_key,'') = COALESCE(cp.variant_key,'')
        AND cp2.number_plain ~ '^\d+$'
        AND cp2.number_plain::int = cp.number_plain::int
        AND cp2.id <> cp.id
    )
),
dup_by_set AS (
  SELECT set_code, COUNT(DISTINCT card_print_id) AS dup_print_ids
  FROM dup_ids GROUP BY set_code
),
mapped_to_dup AS (
  SELECT m.set_code, COUNT(*) AS mapped_rows_pointing_at_dupe
  FROM mapped m
  JOIN dup_ids d
    ON d.set_code=m.set_code AND d.card_print_id=m.card_print_id
  WHERE m.card_print_id IS NOT NULL
  GROUP BY m.set_code
)
SELECT
  m.set_code,
  COALESCE(cc.canonical_prints,0) AS canonical_prints,
  COUNT(*) AS raw_cards,
  COUNT(*) FILTER (WHERE m.card_print_id IS NOT NULL) AS mapped,
  COUNT(*) FILTER (WHERE m.card_print_id IS NULL) AS still_missing,
  COALESCE(db.dup_print_ids,0) AS dup_print_ids_in_canonical,
  COALESCE(md.mapped_rows_pointing_at_dupe,0) AS mapped_rows_pointing_at_dupe
FROM mapped m
LEFT JOIN canonical_counts cc ON cc.set_code=m.set_code
LEFT JOIN dup_by_set db ON db.set_code=m.set_code
LEFT JOIN mapped_to_dup md ON md.set_code=m.set_code
GROUP BY m.set_code, cc.canonical_prints, db.dup_print_ids, md.mapped_rows_pointing_at_dupe
ORDER BY still_missing DESC, mapped_rows_pointing_at_dupe DESC, raw_cards DESC, m.set_code;
```

### 2.3 Alias coverage audit for “missing” sets
Use this to find sets that look unmapped because `tcgdex_set_code` is an alias.
```sql
WITH tcgdex_missing_sets AS (
  SELECT
    COALESCE(payload->>'_set_external_id', payload->>'set_external_id') AS tcgdex_set_code,
    COUNT(*) AS missing_count
  FROM public.raw_imports
  WHERE source='tcgdex'
    AND payload->>'_kind'='card'
    AND NOT EXISTS (
      SELECT 1 FROM public.external_mappings em
      WHERE em.source='tcgdex'
        AND em.external_id = (raw_imports.payload->>'_external_id')
    )
  GROUP BY 1
),
classed AS (
  SELECT ms.tcgdex_set_code, ms.missing_count,
         scc.is_canon, scc.canonical_set_code
  FROM tcgdex_missing_sets ms
  LEFT JOIN public.set_code_classification scc
    ON scc.set_code = ms.tcgdex_set_code
),
canon_prints AS (
  SELECT s.code AS set_code, COUNT(*) AS prints
  FROM public.card_prints cp
  JOIN public.sets s ON s.id=cp.set_id
  GROUP BY s.code
)
SELECT
  c.tcgdex_set_code,
  c.missing_count,
  (c.is_canon IS NOT NULL) AS has_classification_row,
  c.is_canon,
  c.canonical_set_code,
  COALESCE(cp.prints,0) AS canonical_prints_for_canonical_set_code,
  COALESCE(cp2.prints,0) AS prints_if_using_tcgdex_code_directly
FROM classed c
LEFT JOIN canon_prints cp  ON cp.set_code  = c.canonical_set_code
LEFT JOIN canon_prints cp2 ON cp2.set_code = c.tcgdex_set_code
ORDER BY c.missing_count DESC, c.tcgdex_set_code
LIMIT 80;
```

---

## 3) Known Strange Issues (Root Causes + Fixes)

### 3.1 Padding drift (e.g., `003` vs `3`)
- Symptom: TCGdex `localId` padded; canon `number_plain` unpadded; mapping join fails.
- Fix: **Do not canonicalize padding**. Canon should be numeric-normalized for numeric-only identities.
- Safe merge pattern: merge padded duplicate rows into unpadded row **only when semantic equivalence holds** (same set/name/variant_key) and drop row has no high-risk refs.

### 3.2 Set alias drift (`sv06.5` vs `sv6pt5`)
- Symptom: `sets.code=sv06.5` exists but has 0 prints; real prints live under `sv6pt5`; tcgdex raws use `sv06.5`.
- Fix: Update `set_code_classification` for alias to route:
```sql
UPDATE public.set_code_classification
SET canonical_set_code = 'sv6pt5',
    notes = COALESCE(notes,'') || ' | Alias routed to sv6pt5 for TCGdex set_code alignment.'
WHERE set_code='sv06.5'
RETURNING set_code, is_canon, canonical_set_code, notes;
```
Then do routed mapping backfill (see §4.3).

### 3.3 `number_plain` was a generated digit-stripper (breaking Holo namespaces)
- Symptom: `H07` computed to `07`, colliding with card `7` in e-Card era sets.
- Root cause: generator expression stripped non-digits.
- Fix: **Preserve prefix+digits**: if `number ~ '^[A-Za-z][0-9]+$'` then `upper(number)`.
- Hard part: views depended on `number_plain`, requiring explicit drop/recreate (no CASCADE).
- Final outcome: `H07 → H07`, `H09 → H09` (verified).

### 3.4 View dependency block on column swap
- Symptom: cannot drop `number_plain` because views depend.
- Fix: Freeze view defs (`pg_get_viewdef`) then drop/recreate explicitly in dependency order.

### 3.5 Non-numeric localId suffix (e.g., `50a`, `74a`, `103b`)
- These are not resolvable via numeric join. They require inspecting printed identity and canonical modeling. Often Canon Gap until Option B.

### 3.6 Canon Gap vs Mapping Gap
- If tcgdex raws exist but canonical prints for that localId do not exist: **not mappable**. Classify as Canon Gap.

---

## 4) Mapping Backfill SQL Templates (Exact)

### 4.1 Standard per-set mapping backfill (numeric localId)
Use when:
- Set is canonical (or tcgdex set_code equals canonical set code)
- Canon prints exist
- `localId ~ '^\d+$'`

**DRY RUN**
```sql
WITH tcgdex_missing AS (
  SELECT
    (payload->>'_external_id') AS external_id,
    (payload->'card'->>'localId') AS local_id
  FROM public.raw_imports
  WHERE source='tcgdex'
    AND payload->>'_kind'='card'
    AND COALESCE(payload->>'_set_external_id', payload->>'set_external_id') = '<SET_CODE>'
    AND (payload->'card'->>'localId') ~ '^\d+$'
    AND NOT EXISTS (
      SELECT 1 FROM public.external_mappings em
      WHERE em.source='tcgdex'
        AND em.external_id = (raw_imports.payload->>'_external_id')
    )
),
canon AS (
  SELECT cp.id AS card_print_id, cp.number_plain
  FROM public.card_prints cp
  JOIN public.sets s ON s.id=cp.set_id
  WHERE s.code='<SET_CODE>'
    AND cp.number_plain ~ '^\d+$'
)
SELECT c.card_print_id, 'tcgdex'::text AS source, r.external_id, true AS active
FROM tcgdex_missing r
JOIN canon c
  ON (r.local_id::int = c.number_plain::int)
ORDER BY r.external_id;
```

**APPLY**
```sql
INSERT INTO public.external_mappings (card_print_id, source, external_id, active, synced_at, meta)
WITH tcgdex_missing AS (
  SELECT (payload->>'_external_id') AS external_id,
         (payload->'card'->>'localId') AS local_id
  FROM public.raw_imports
  WHERE source='tcgdex'
    AND payload->>'_kind'='card'
    AND COALESCE(payload->>'_set_external_id', payload->>'set_external_id') = '<SET_CODE>'
    AND (payload->'card'->>'localId') ~ '^\d+$'
    AND NOT EXISTS (
      SELECT 1 FROM public.external_mappings em
      WHERE em.source='tcgdex'
        AND em.external_id = (raw_imports.payload->>'_external_id')
    )
),
canon AS (
  SELECT cp.id AS card_print_id, cp.number_plain
  FROM public.card_prints cp
  JOIN public.sets s ON s.id=cp.set_id
  WHERE s.code='<SET_CODE>'
    AND cp.number_plain ~ '^\d+$'
)
SELECT
  c.card_print_id,
  'tcgdex'::text,
  r.external_id,
  true,
  now(),
  jsonb_build_object('backfill', '<SET_CODE> tcgdex id mapping', 'join', 'localId::int = number_plain::int')
FROM tcgdex_missing r
JOIN canon c
  ON (r.local_id::int = c.number_plain::int)
ON CONFLICT (source, external_id) DO NOTHING;
```

**VERIFY**
```sql
WITH raws AS (
  SELECT (payload->>'_external_id') AS external_id
  FROM public.raw_imports
  WHERE source='tcgdex' AND payload->>'_kind'='card'
    AND COALESCE(payload->>'_set_external_id', payload->>'set_external_id')='<SET_CODE>'
)
SELECT
  COUNT(*) AS raw_cards,
  COUNT(*) FILTER (WHERE em.external_id IS NOT NULL) AS mapped,
  COUNT(*) FILTER (WHERE em.external_id IS NULL) AS still_missing
FROM raws r
LEFT JOIN public.external_mappings em
  ON em.source='tcgdex' AND em.external_id=r.external_id;
```

### 4.2 Routed per-set mapping backfill (alias → canonical)
Use when:
- TCGdex set_code is an alias (e.g., `sv06.5`)
- Canon prints live under `set_code_classification.canonical_set_code`

**DRY RUN**
```sql
WITH route AS (
  SELECT canonical_set_code
  FROM public.set_code_classification
  WHERE set_code = '<TCGDEX_SET_CODE>'
),
tcgdex_missing AS (
  SELECT (payload->>'_external_id') AS external_id,
         (payload->'card'->>'localId') AS local_id
  FROM public.raw_imports
  WHERE source='tcgdex'
    AND payload->>'_kind'='card'
    AND COALESCE(payload->>'_set_external_id', payload->>'set_external_id')='<TCGDEX_SET_CODE>'
    AND NOT EXISTS (
      SELECT 1 FROM public.external_mappings em
      WHERE em.source='tcgdex'
        AND em.external_id=(raw_imports.payload->>'_external_id')
    )
),
canon AS (
  SELECT cp.id AS card_print_id, cp.number_plain
  FROM public.card_prints cp
  JOIN public.sets s ON s.id=cp.set_id
  WHERE s.code=(SELECT canonical_set_code FROM route)
)
SELECT c.card_print_id, 'tcgdex'::text, r.external_id, true
FROM tcgdex_missing r
JOIN canon c
  ON (r.local_id ~ '^\d+$')
 AND (c.number_plain ~ '^\d+$')
 AND (r.local_id::int = c.number_plain::int)
ORDER BY r.external_id;
```

**APPLY** (same join; `meta` includes routed_to)
```sql
INSERT INTO public.external_mappings (card_print_id, source, external_id, active, synced_at, meta)
WITH route AS (
  SELECT canonical_set_code
  FROM public.set_code_classification
  WHERE set_code = '<TCGDEX_SET_CODE>'
),
tcgdex_missing AS (
  SELECT (payload->>'_external_id') AS external_id,
         (payload->'card'->>'localId') AS local_id
  FROM public.raw_imports
  WHERE source='tcgdex'
    AND payload->>'_kind'='card'
    AND COALESCE(payload->>'_set_external_id', payload->>'set_external_id')='<TCGDEX_SET_CODE>'
    AND NOT EXISTS (
      SELECT 1 FROM public.external_mappings em
      WHERE em.source='tcgdex'
        AND em.external_id=(raw_imports.payload->>'_external_id')
    )
),
canon AS (
  SELECT cp.id AS card_print_id, cp.number_plain
  FROM public.card_prints cp
  JOIN public.sets s ON s.id=cp.set_id
  WHERE s.code=(SELECT canonical_set_code FROM route)
)
SELECT
  c.card_print_id,
  'tcgdex'::text,
  r.external_id,
  true,
  now(),
  jsonb_build_object('backfill','<TCGDEX_SET_CODE> tcgdex id mapping (routed)',
                     'routed_to',(SELECT canonical_set_code FROM route),
                     'join','localId::int = number_plain::int')
FROM tcgdex_missing r
JOIN canon c
  ON (r.local_id ~ '^\d+$')
 AND (c.number_plain ~ '^\d+$')
 AND (r.local_id::int = c.number_plain::int)
ON CONFLICT (source, external_id) DO NOTHING;
```

### 4.3 Alias routing write (single row)
```sql
UPDATE public.set_code_classification
SET canonical_set_code = '<CANON_CODE>',
    notes = COALESCE(notes,'') || ' | Alias routed to <CANON_CODE> for TCGdex set_code alignment.'
WHERE set_code='<ALIAS_CODE>'
RETURNING set_code, is_canon, canonical_set_code, notes;
```

---

## 5) Identity Repair Patterns

### 5.1 Padding duplicate merge (safe)
Use only when:
- same set
- same name
- same variant_key
- numeric-only identity
- **drop row has 0 high-risk refs** (vault/pricing/identity selections)

High-risk ref audit template:
```sql
-- Replace <SET_CODE>
WITH s AS (
  SELECT cp.id, cp.name, COALESCE(cp.variant_key,'') AS variant_key, cp.number_plain
  FROM public.card_prints cp
  JOIN public.sets st ON st.id=cp.set_id
  WHERE st.code='<SET_CODE>' AND cp.number_plain ~ '^\d+$'
),
pairs AS (
  SELECT a.id AS keep_id, b.id AS drop_id
  FROM s a
  JOIN s b
    ON a.name=b.name AND a.variant_key=b.variant_key
   AND a.number_plain::int=b.number_plain::int
   AND length(a.number_plain) < length(b.number_plain)
)
SELECT p.keep_id, p.drop_id,
  (SELECT COUNT(*) FROM public.vault_items WHERE card_id=p.drop_id) AS vault_refs,
  (SELECT COUNT(*) FROM public.identity_scan_selections WHERE selected_card_print_id=p.drop_id) AS scan_refs,
  (SELECT COUNT(*) FROM public.price_observations WHERE print_id=p.drop_id) AS price_obs_refs
FROM pairs p;
```

Bulk merge pattern (move `external_mappings` + `user_card_photos`, delete drop) was proven on `sv10`.

### 5.2 Prefix namespace preservation (e-Card `Hxx`)
- Do **not** merge `7` and `H07`.
- Ensure `number_plain` preserves `Hxx` by generator logic.
- Verified: `H07 → H07`, `H09 → H09`.

---

## 6) Canon Gap Classification (for Option B)

When you see:
- TCGdex raws exist for localIds
- but canonical prints don’t exist (no `card_prints.number` / `number_plain` for those)

Example discovered:
- `ecard2` had missing canon prints for localIds 11–13, 15–20, 25, 28, 30, 32, plus suffix ids like 50a.

These move to **Option B: Canonical Completion**.

---

## 7) Audit Report for Next Chat (Snapshot + What Changed)

### 7.1 Completed repairs in this session
- `sv10`: padding dupes merged; tcgdex mappings backfilled; **244/244 mapped**.
- `swsh3.5`: tcgdex mappings backfilled; **80/80 mapped**.
- `swsh4.5`: tcgdex mappings backfilled; **195/195 mapped**.
- `sv06.5`: alias routing fixed (`sv06.5 → sv6pt5`); mappings backfilled; **99/99 mapped**.
- `ecard2`: corrected identity model for holo namespace (`H07` etc). Required:
  - recognizing `number_plain` generated expression was wrong,
  - explicit view freeze/drop/recreate,
  - swapping generated column via v2,
  - restoring all dependent views (no CASCADE),
  - verified sample: `H07 → H07`, `H09 → H09`.

### 7.2 Remaining work buckets (next chat)
- **Alias routing gaps**: any row in §2.3 where `is_canon=false` and `canonical_set_code IS NULL` but prints exist under another code.
- **Duplicate-risk sets**: any set with `mapped_rows_pointing_at_dupe > 0`.
- **Straight mapping backfills**: sets where prints exist and join is deterministic.
- **Canon Gaps**: sets where raw has cards but canonical prints missing.

### 7.3 Re-run scoreboards
In the next chat, start by running §2.1 and §2.2 to get the new baseline.

---

## 8) Operating Discipline (Completion Checklist)

For each target set:
1) Run §2.2 and locate the set row.
2) If `mapped_rows_pointing_at_dupe > 0` → identity repair first.
3) If `canonical_prints = 0` but set exists elsewhere → alias routing (§4.3).
4) If mapping is possible → run DRY RUN (§4.1 or §4.2) and confirm row count.
5) APPLY mapping insert.
6) VERIFY mapping coverage for that set.
7) Log set as CLOSED.

---

## Appendix A — View freeze list (used in number_plain swap)
The dependency chain captured:
- `public.card_prints_clean`
- `public.card_print_active_prices`
- `public.v_grookai_value_v1`
- `public.v_best_prices_all_gv_v1`
- `public.v_vault_items`
- `public.v_recently_added`
- `public.v_vault_items_ext`
- `public.v_vault_items_web`
- `public.v_grookai_value_v1_1`
- `public.v_card_prints_canon`
- `public.v_image_coverage_canon`
- `public.v_card_prints_noncanon`
- `public.v_image_coverage_noncanon`
- `public.v_special_set_print_membership`
- `public.v_card_prints_web_v1`

(Use the exact freeze query from §2.2 / the prior error list when repeating this surgery.)

