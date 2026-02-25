# PLAYBOOK — Mapping Coverage V2 + Alias + Canon Promotion + TK Printing Mapping (Deterministic)

## Purpose
This playbook defines the deterministic workflow to:
1) Generate a truthful mapping coverage scoreboard from `raw_imports (tcgdex)`
2) Resolve alias sets (non-canon set_code routed to `canonical_set_code`) without duplicating prints
3) Decide when to promote a set to canonical (official product => own identity) and close it with Coverage v2
4) Handle Trainer Kit (tk-*) safely using printing children (`card_printings`) and `external_printing_mappings`, without corrupting canonical identity

---

## 0) Non-Negotiable Rules

### R0 — Never guess joins
If any raw card maps to multiple candidates, **STOP**.
Do not write `external_mappings` / `external_printing_mappings` until a deterministic join key yields exactly 1 candidate.

### R1 — Identity layers
- Canonical print identity: `card_prints` (parent)
- Finish/printing identity: `card_printings` (children)
- Canon mapping: `external_mappings` -> points to `card_prints.id`
- Printing mapping: `external_printing_mappings` -> points to `card_printings.id`

### R2 — Official physical products get identity
**If it is an official product and has unique product-set identity -> it can be canonicalized as its own set**
(Example: McDonald's yearly sets, `ex5.5` Poke Card Creator Pack)

### R3 — Alias sets are not canonized
If `set_code_classification.canonical_set_code` routes the set to a canonical parent, do **alias mapping**, not canon materialization.
(Example: `fut2020` -> `fut20`)

---

## 1) Coverage Scoreboard (Truthful)

### 1.1 Raw coverage scoreboard (dedup-safe)
This version does **not multiply rows** when printing mappings exist.

```sql
WITH tcgdex_raws AS (
  SELECT
    COALESCE(payload->>'_set_external_id', payload->>'set_external_id') AS set_code,
    (payload->>'_external_id') AS external_id
  FROM public.raw_imports
  WHERE source='tcgdex'
    AND payload->>'_kind'='card'
),
coverage AS (
  SELECT
    r.set_code,
    r.external_id,
    EXISTS (
      SELECT 1
      FROM public.external_mappings em
      WHERE em.source='tcgdex'
        AND em.external_id = r.external_id
    ) AS mapped_canon,
    EXISTS (
      SELECT 1
      FROM public.external_printing_mappings epm
      WHERE epm.source='tcgdex'
        AND epm.external_id LIKE (r.external_id || ':%') -- e.g. tk-hs-g-20:normal
    ) AS mapped_printing
  FROM tcgdex_raws r
)
SELECT
  set_code,
  COUNT(*) AS raw_cards,
  COUNT(*) FILTER (WHERE mapped_canon) AS mapped_canon,
  COUNT(*) FILTER (WHERE mapped_printing) AS mapped_printing,
  COUNT(*) FILTER (WHERE mapped_canon OR mapped_printing) AS total_mapped,
  COUNT(*) FILTER (WHERE NOT mapped_canon AND NOT mapped_printing) AS still_unmapped
FROM coverage
GROUP BY set_code
ORDER BY still_unmapped DESC, raw_cards DESC, set_code;
```

Interpretation:
- `mapped_canon` = external_mappings exists for that raw card
- `mapped_printing` = at least one `external_printing_mappings` exists for that raw card (`external_id:*`)
- Counts represent **raw card coverage**, not printing mapping count.

(Optional printing mapping count KPI)

```sql
WITH tcgdex_raws AS (
  SELECT
    COALESCE(payload->>'_set_external_id', payload->>'set_external_id') AS set_code,
    (payload->>'_external_id') AS external_id
  FROM public.raw_imports
  WHERE source='tcgdex'
    AND payload->>'_kind'='card'
)
SELECT
  r.set_code,
  COUNT(*) AS raw_cards,
  SUM((
    SELECT COUNT(*)
    FROM public.external_printing_mappings epm
    WHERE epm.source='tcgdex'
      AND epm.external_id LIKE (r.external_id || ':%')
  )) AS printing_mappings
FROM tcgdex_raws r
GROUP BY r.set_code
ORDER BY printing_mappings DESC, raw_cards DESC, set_code;
```

---

## 2) Set Triage Decision Tree (Single-Step Discipline)

For a target set `:set_code`:

### Step A — Lane-shape preflight

```sql
WITH u AS (
  SELECT payload->'card'->>'localId' AS local_id
  FROM public.raw_imports
  WHERE source='tcgdex'
    AND payload->>'_kind'='card'
    AND COALESCE(payload->>'_set_external_id', payload->>'set_external_id') = :set_code
    AND (payload->>'_external_id') NOT IN (
      SELECT external_id FROM public.external_mappings WHERE source='tcgdex'
      UNION ALL
      SELECT split_part(external_id, ':', 1) FROM public.external_printing_mappings WHERE source='tcgdex'
    )
)
SELECT
  COUNT(*) AS unmapped,
  COUNT(*) FILTER (WHERE local_id ~ '^[0-9]+$') AS numeric_localid,
  COUNT(*) FILTER (WHERE local_id ~ '^[A-Za-z]+[0-9]+$') AS prefix_alpha_numeric,
  COUNT(*) FILTER (WHERE local_id !~ '^[0-9]+$' AND local_id !~ '^[A-Za-z]+[0-9]+$') AS other_shape,
  MIN(local_id) AS min_localid,
  MAX(local_id) AS max_localid
FROM u;
```

### Step B — Canon presence gate

```sql
SELECT
  s.id, s.code, s.name,
  COUNT(cp.id) AS canon_prints
FROM public.sets s
LEFT JOIN public.card_prints cp ON cp.set_id = s.id
WHERE s.code = :set_code
GROUP BY s.id, s.code, s.name;
```

### Step C — Classification gate

```sql
SELECT
  set_code,
  is_canon,
  canon_source,
  tcgdex_set_id,
  canonical_set_code,
  notes
FROM public.set_code_classification
WHERE set_code = :set_code
   OR tcgdex_set_id = :set_code
   OR canonical_set_code = :set_code;
```

Branch outcomes:
- Alias mapping: `is_canon=false` AND `canonical_set_code IS NOT NULL`
- Canonization candidate: `is_canon=false` AND `canonical_set_code IS NULL` AND official product
- Already canon: `is_canon=true`
- Deferred: explicitly parked by policy

---

## 3) Alias Mapping Workflow (Example: fut2020 -> fut20)

### 3.1 Alias proof join (classification + canon presence)

```sql
WITH cls AS (
  SELECT
    set_code,
    is_canon,
    canonical_set_code,
    tcgdex_set_id,
    notes
  FROM public.set_code_classification
  WHERE set_code = 'fut2020'
),
canon_prints AS (
  SELECT s.code AS set_code, COUNT(*) AS prints
  FROM public.card_prints cp
  JOIN public.sets s ON s.id = cp.set_id
  WHERE s.code IN ('fut2020', 'fut20')
  GROUP BY s.code
)
SELECT
  c.set_code,
  c.is_canon,
  c.canonical_set_code,
  c.tcgdex_set_id,
  COALESCE(cp_alias.prints, 0) AS prints_under_alias,
  COALESCE(cp_canon.prints, 0) AS prints_under_canon
FROM cls c
LEFT JOIN canon_prints cp_alias ON cp_alias.set_code = c.set_code
LEFT JOIN canon_prints cp_canon ON cp_canon.set_code = c.canonical_set_code;
```

### 3.2 DRY RUN alias mapping insert

```sql
WITH route AS (
  SELECT canonical_set_code
  FROM public.set_code_classification
  WHERE set_code = 'fut2020'
),
tcgdex_missing AS (
  SELECT
    (ri.payload->>'_external_id') AS external_id,
    (ri.payload->'card'->>'localId') AS local_id
  FROM public.raw_imports ri
  WHERE ri.source='tcgdex'
    AND ri.payload->>'_kind'='card'
    AND COALESCE(ri.payload->>'_set_external_id', ri.payload->>'set_external_id') = 'fut2020'
    AND (ri.payload->'card'->>'localId') ~ '^\d+$'
    AND NOT EXISTS (
      SELECT 1
      FROM public.external_mappings em
      WHERE em.source='tcgdex'
        AND em.external_id = (ri.payload->>'_external_id')
    )
),
canon AS (
  SELECT
    cp.id AS card_print_id,
    cp.number_plain
  FROM public.card_prints cp
  JOIN public.sets s ON s.id = cp.set_id
  WHERE s.code = (SELECT canonical_set_code FROM route)
    AND cp.number_plain ~ '^\d+$'
    AND COALESCE(cp.variant_key, '') = ''
)
SELECT
  c.card_print_id,
  m.external_id,
  m.local_id
FROM tcgdex_missing m
JOIN canon c
  ON m.local_id::int = c.number_plain::int
ORDER BY m.external_id;
```

### 3.3 APPLY alias mapping insert

```sql
INSERT INTO public.external_mappings (card_print_id, source, external_id, active, synced_at, meta)
WITH route AS (
  SELECT canonical_set_code
  FROM public.set_code_classification
  WHERE set_code = 'fut2020'
),
tcgdex_missing AS (
  SELECT
    (ri.payload->>'_external_id') AS external_id,
    (ri.payload->'card'->>'localId') AS local_id
  FROM public.raw_imports ri
  WHERE ri.source='tcgdex'
    AND ri.payload->>'_kind'='card'
    AND COALESCE(ri.payload->>'_set_external_id', ri.payload->>'set_external_id') = 'fut2020'
    AND (ri.payload->'card'->>'localId') ~ '^\d+$'
    AND NOT EXISTS (
      SELECT 1
      FROM public.external_mappings em
      WHERE em.source='tcgdex'
        AND em.external_id = (ri.payload->>'_external_id')
    )
),
canon AS (
  SELECT
    cp.id AS card_print_id,
    cp.number_plain
  FROM public.card_prints cp
  JOIN public.sets s ON s.id = cp.set_id
  WHERE s.code = (SELECT canonical_set_code FROM route)
    AND cp.number_plain ~ '^\d+$'
    AND COALESCE(cp.variant_key, '') = ''
)
SELECT
  c.card_print_id,
  'tcgdex',
  m.external_id,
  true,
  now(),
  jsonb_build_object(
    'backfill', 'fut2020 alias mapping',
    'routed_to', (SELECT canonical_set_code FROM route),
    'join', 'localId::int = number_plain::int'
  )
FROM tcgdex_missing m
JOIN canon c
  ON m.local_id::int = c.number_plain::int
ON CONFLICT (source, external_id) DO NOTHING;
```

### 3.4 Verify closure (Coverage v2 for fut2020)

```sql
WITH tcgdex_raws AS (
  SELECT
    COALESCE(payload->>'_set_external_id', payload->>'set_external_id') AS set_code,
    (payload->>'_external_id') AS external_id
  FROM public.raw_imports
  WHERE source='tcgdex'
    AND payload->>'_kind'='card'
    AND COALESCE(payload->>'_set_external_id', payload->>'set_external_id') = 'fut2020'
),
coverage AS (
  SELECT
    r.set_code,
    r.external_id,
    EXISTS (
      SELECT 1
      FROM public.external_mappings em
      WHERE em.source='tcgdex'
        AND em.external_id = r.external_id
    ) AS mapped_canon,
    EXISTS (
      SELECT 1
      FROM public.external_printing_mappings epm
      WHERE epm.source='tcgdex'
        AND epm.external_id LIKE (r.external_id || ':%')
    ) AS mapped_printing
  FROM tcgdex_raws r
)
SELECT
  set_code,
  COUNT(*) AS raw_cards,
  COUNT(*) FILTER (WHERE mapped_canon) AS mapped_canon,
  COUNT(*) FILTER (WHERE mapped_printing) AS mapped_printing,
  COUNT(*) FILTER (WHERE NOT mapped_canon AND NOT mapped_printing) AS still_unmapped
FROM coverage
GROUP BY set_code;
```

Expected gate:
- `still_unmapped = 0`

---

## 4) Canon Promotion + Closure Workflow (Example: ex5.5)

### 4.1 Promote classification to canonical

```sql
INSERT INTO public.set_code_classification (
  set_code,
  is_canon,
  canon_source,
  tcgdex_set_id,
  canonical_set_code,
  notes
)
VALUES (
  'ex5.5',
  true,
  'manual',
  'ex5.5',
  'ex5.5',
  'Canonicalized from official product identity (ex5.5).'
)
ON CONFLICT (set_code) DO UPDATE
SET
  is_canon = EXCLUDED.is_canon,
  canon_source = EXCLUDED.canon_source,
  tcgdex_set_id = EXCLUDED.tcgdex_set_id,
  canonical_set_code = EXCLUDED.canonical_set_code,
  notes = EXCLUDED.notes
RETURNING set_code, is_canon, canon_source, tcgdex_set_id, canonical_set_code, notes;
```

### 4.2 Update set metadata from raw card count

```sql
WITH counts AS (
  SELECT COUNT(*)::int AS raw_cards
  FROM public.raw_imports
  WHERE source='tcgdex'
    AND payload->>'_kind'='card'
    AND COALESCE(payload->>'_set_external_id', payload->>'set_external_id') = 'ex5.5'
)
UPDATE public.sets s
SET
  total = c.raw_cards,
  printed_total = c.raw_cards,
  updated_at = now()
FROM counts c
WHERE s.code = 'ex5.5'
RETURNING s.id, s.code, s.total, s.printed_total;
```

### 4.3 DRY RUN canonical print insert (`would_insert`)

```sql
WITH set_row AS (
  SELECT id AS set_id
  FROM public.sets
  WHERE code = 'ex5.5'
),
raw_numeric AS (
  SELECT DISTINCT
    (ri.payload->'card'->>'localId') AS local_id,
    COALESCE(ri.payload->'card'->>'name', ri.payload->>'name') AS card_name,
    NULLIF(ri.payload->'card'->>'rarity', '') AS rarity
  FROM public.raw_imports ri
  WHERE ri.source='tcgdex'
    AND ri.payload->>'_kind'='card'
    AND COALESCE(ri.payload->>'_set_external_id', ri.payload->>'set_external_id') = 'ex5.5'
    AND (ri.payload->'card'->>'localId') ~ '^\d+$'
),
would_insert AS (
  SELECT
    sr.set_id,
    rn.card_name,
    rn.local_id,
    rn.rarity
  FROM raw_numeric rn
  CROSS JOIN set_row sr
  LEFT JOIN public.card_prints cp
    ON cp.set_id = sr.set_id
   AND cp.number = rn.local_id
   AND COALESCE(cp.variant_key, '') = ''
  WHERE cp.id IS NULL
)
SELECT COUNT(*) AS would_insert
FROM would_insert;
```

### 4.4 APPLY canonical print insert (no `number_plain` writes)

```sql
INSERT INTO public.card_prints (set_id, name, number, rarity)
WITH set_row AS (
  SELECT id AS set_id
  FROM public.sets
  WHERE code = 'ex5.5'
),
raw_numeric AS (
  SELECT DISTINCT
    (ri.payload->'card'->>'localId') AS local_id,
    COALESCE(ri.payload->'card'->>'name', ri.payload->>'name') AS card_name,
    NULLIF(ri.payload->'card'->>'rarity', '') AS rarity
  FROM public.raw_imports ri
  WHERE ri.source='tcgdex'
    AND ri.payload->>'_kind'='card'
    AND COALESCE(ri.payload->>'_set_external_id', ri.payload->>'set_external_id') = 'ex5.5'
    AND (ri.payload->'card'->>'localId') ~ '^\d+$'
),
missing AS (
  SELECT
    sr.set_id,
    rn.card_name,
    rn.local_id,
    rn.rarity
  FROM raw_numeric rn
  CROSS JOIN set_row sr
  LEFT JOIN public.card_prints cp
    ON cp.set_id = sr.set_id
   AND cp.number = rn.local_id
   AND COALESCE(cp.variant_key, '') = ''
  WHERE cp.id IS NULL
)
SELECT
  m.set_id,
  m.card_name,
  m.local_id,
  m.rarity
FROM missing m
RETURNING id, number, number_plain, name, rarity;
```

### 4.5 APPLY ex5.5 canonical mapping backfill

```sql
INSERT INTO public.external_mappings (card_print_id, source, external_id, active, synced_at, meta)
WITH tcgdex_missing AS (
  SELECT
    (ri.payload->>'_external_id') AS external_id,
    (ri.payload->'card'->>'localId') AS local_id
  FROM public.raw_imports ri
  WHERE ri.source='tcgdex'
    AND ri.payload->>'_kind'='card'
    AND COALESCE(ri.payload->>'_set_external_id', ri.payload->>'set_external_id') = 'ex5.5'
    AND (ri.payload->'card'->>'localId') ~ '^\d+$'
    AND NOT EXISTS (
      SELECT 1
      FROM public.external_mappings em
      WHERE em.source='tcgdex'
        AND em.external_id = (ri.payload->>'_external_id')
    )
),
canon AS (
  SELECT
    cp.id AS card_print_id,
    cp.number_plain
  FROM public.card_prints cp
  JOIN public.sets s ON s.id = cp.set_id
  WHERE s.code = 'ex5.5'
    AND cp.number_plain ~ '^\d+$'
    AND COALESCE(cp.variant_key, '') = ''
)
SELECT
  c.card_print_id,
  'tcgdex',
  m.external_id,
  true,
  now(),
  jsonb_build_object('backfill', 'ex5.5 canon mapping', 'join', 'localId::int = number_plain::int')
FROM tcgdex_missing m
JOIN canon c
  ON m.local_id::int = c.number_plain::int
ON CONFLICT (source, external_id) DO NOTHING;
```

### 4.6 Coverage v2 closure proof (ex5.5)

```sql
WITH tcgdex_raws AS (
  SELECT
    COALESCE(payload->>'_set_external_id', payload->>'set_external_id') AS set_code,
    (payload->>'_external_id') AS external_id
  FROM public.raw_imports
  WHERE source='tcgdex'
    AND payload->>'_kind'='card'
    AND COALESCE(payload->>'_set_external_id', payload->>'set_external_id') = 'ex5.5'
),
coverage AS (
  SELECT
    r.set_code,
    r.external_id,
    EXISTS (
      SELECT 1
      FROM public.external_mappings em
      WHERE em.source='tcgdex'
        AND em.external_id = r.external_id
    ) AS mapped_canon,
    EXISTS (
      SELECT 1
      FROM public.external_printing_mappings epm
      WHERE epm.source='tcgdex'
        AND epm.external_id LIKE (r.external_id || ':%')
    ) AS mapped_printing
  FROM tcgdex_raws r
)
SELECT
  set_code,
  COUNT(*) AS raw_cards,
  COUNT(*) FILTER (WHERE mapped_canon) AS mapped_canon,
  COUNT(*) FILTER (WHERE mapped_printing) AS mapped_printing,
  COUNT(*) FILTER (WHERE NOT mapped_canon AND NOT mapped_printing) AS still_unmapped
FROM coverage
GROUP BY set_code;
```

Expected gate:
- `still_unmapped = 0`

---

## 5) TK Safe Mapping Pattern (No Canon Duplication)

### Key rule
- Do NOT create new canonical `card_prints` for TK by default.
- TK maps to existing prints using deterministic join keys.
- Finish variants are children (`card_printings`) and mapped via `external_printing_mappings`.

### Deterministic join key V1
- tk raw: `dexId[0]` -> match `card_print_traits.national_dex`
- tk raw: `illustrator` -> match `card_prints.artist`
- tk raw: `name` -> match `card_prints.name`

#### Uniqueness proof (single tk external_id)

```sql
WITH tk AS (
  SELECT
    (ri.payload->>'_external_id') AS external_id,
    ri.payload->'card' AS card_json
  FROM public.raw_imports ri
  WHERE ri.source='tcgdex'
    AND ri.payload->>'_kind'='card'
    AND COALESCE(ri.payload->>'_set_external_id', ri.payload->>'set_external_id') = 'tk-hs-g'
    AND (ri.payload->>'_external_id') = 'tk-hs-g-20'
),
candidates AS (
  SELECT
    t.external_id,
    cp.id AS card_print_id
  FROM tk t
  JOIN public.card_prints cp
    ON lower(cp.name) = lower(t.card_json->>'name')
   AND lower(COALESCE(cp.artist, '')) = lower(COALESCE(t.card_json->>'illustrator', ''))
  JOIN public.card_print_traits cpt
    ON cpt.card_print_id = cp.id
   AND cpt.trait_type = 'national_dex'
   AND cpt.trait_value ~ '^\d+$'
  WHERE (t.card_json->'dexId'->>0) ~ '^\d+$'
    AND cpt.trait_value::int = (t.card_json->'dexId'->>0)::int
)
SELECT
  external_id,
  COUNT(*) AS candidate_rows,
  ARRAY_AGG(card_print_id) AS candidate_ids
FROM candidates
GROUP BY external_id;
```

Expected gate:
- `candidate_rows = 1`

#### Set preflight (STOP unless `no_match=0` and `ambiguous=0`)

```sql
WITH tk_rows AS (
  SELECT DISTINCT
    (ri.payload->>'_external_id') AS external_id,
    ri.payload->'card' AS card_json
  FROM public.raw_imports ri
  WHERE ri.source='tcgdex'
    AND ri.payload->>'_kind'='card'
    AND COALESCE(ri.payload->>'_set_external_id', ri.payload->>'set_external_id') = 'tk-hs-g'
),
candidates AS (
  SELECT
    t.external_id,
    cp.id AS card_print_id
  FROM tk_rows t
  LEFT JOIN public.card_prints cp
    ON lower(cp.name) = lower(t.card_json->>'name')
   AND lower(COALESCE(cp.artist, '')) = lower(COALESCE(t.card_json->>'illustrator', ''))
  LEFT JOIN public.card_print_traits cpt
    ON cpt.card_print_id = cp.id
   AND cpt.trait_type = 'national_dex'
   AND cpt.trait_value ~ '^\d+$'
   AND (t.card_json->'dexId'->>0) ~ '^\d+$'
   AND cpt.trait_value::int = (t.card_json->'dexId'->>0)::int
),
per_external AS (
  SELECT external_id, COUNT(card_print_id) AS candidate_count
  FROM candidates
  GROUP BY external_id
)
SELECT
  COUNT(*) AS tk_rows,
  COUNT(*) FILTER (WHERE candidate_count = 1) AS unique_ok,
  COUNT(*) FILTER (WHERE candidate_count = 0) AS no_match,
  COUNT(*) FILTER (WHERE candidate_count > 1) AS ambiguous
FROM per_external;
```

### Finish children creation
- `card_printings.finish_key` values: `normal`, `reverse`, `holo`

#### Check `card_printings` columns

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'card_printings'
ORDER BY ordinal_position;
```

#### Check existing finish rows for resolved TK prints

```sql
WITH resolved AS (
  SELECT DISTINCT
    cp.id AS card_print_id
  FROM public.raw_imports ri
  JOIN public.card_prints cp
    ON lower(cp.name) = lower(ri.payload->'card'->>'name')
   AND lower(COALESCE(cp.artist, '')) = lower(COALESCE(ri.payload->'card'->>'illustrator', ''))
  JOIN public.card_print_traits cpt
    ON cpt.card_print_id = cp.id
   AND cpt.trait_type = 'national_dex'
   AND cpt.trait_value ~ '^\d+$'
  WHERE ri.source='tcgdex'
    AND ri.payload->>'_kind'='card'
    AND COALESCE(ri.payload->>'_set_external_id', ri.payload->>'set_external_id') = 'tk-hs-g'
    AND (ri.payload->'card'->'dexId'->>0) ~ '^\d+$'
    AND cpt.trait_value::int = (ri.payload->'card'->'dexId'->>0)::int
)
SELECT
  r.card_print_id,
  ARRAY_AGG(DISTINCT cpn.finish_key ORDER BY cpn.finish_key) AS finish_keys
FROM resolved r
LEFT JOIN public.card_printings cpn
  ON cpn.card_print_id = r.card_print_id
GROUP BY r.card_print_id
ORDER BY r.card_print_id;
```

#### DRY RUN reverse/holo insert (`would_insert=2` on tk-hs-g-20 path)

```sql
WITH target AS (
  SELECT DISTINCT
    cp.id AS card_print_id
  FROM public.raw_imports ri
  JOIN public.card_prints cp
    ON lower(cp.name) = lower(ri.payload->'card'->>'name')
   AND lower(COALESCE(cp.artist, '')) = lower(COALESCE(ri.payload->'card'->>'illustrator', ''))
  JOIN public.card_print_traits cpt
    ON cpt.card_print_id = cp.id
   AND cpt.trait_type = 'national_dex'
   AND cpt.trait_value ~ '^\d+$'
  WHERE ri.source='tcgdex'
    AND ri.payload->>'_kind'='card'
    AND COALESCE(ri.payload->>'_set_external_id', ri.payload->>'set_external_id') = 'tk-hs-g'
    AND (ri.payload->>'_external_id') = 'tk-hs-g-20'
    AND (ri.payload->'card'->'dexId'->>0) ~ '^\d+$'
    AND cpt.trait_value::int = (ri.payload->'card'->'dexId'->>0)::int
),
missing AS (
  SELECT t.card_print_id, f.finish_key
  FROM target t
  CROSS JOIN (VALUES ('reverse'), ('holo')) AS f(finish_key)
  LEFT JOIN public.card_printings cpn
    ON cpn.card_print_id = t.card_print_id
   AND cpn.finish_key = f.finish_key
  WHERE cpn.card_print_id IS NULL
)
SELECT COUNT(*) AS would_insert
FROM missing;
```

#### APPLY reverse/holo children

```sql
INSERT INTO public.card_printings (card_print_id, finish_key)
WITH target AS (
  SELECT DISTINCT
    cp.id AS card_print_id
  FROM public.raw_imports ri
  JOIN public.card_prints cp
    ON lower(cp.name) = lower(ri.payload->'card'->>'name')
   AND lower(COALESCE(cp.artist, '')) = lower(COALESCE(ri.payload->'card'->>'illustrator', ''))
  JOIN public.card_print_traits cpt
    ON cpt.card_print_id = cp.id
   AND cpt.trait_type = 'national_dex'
   AND cpt.trait_value ~ '^\d+$'
  WHERE ri.source='tcgdex'
    AND ri.payload->>'_kind'='card'
    AND COALESCE(ri.payload->>'_set_external_id', ri.payload->>'set_external_id') = 'tk-hs-g'
    AND (ri.payload->'card'->'dexId'->>0) ~ '^\d+$'
    AND cpt.trait_value::int = (ri.payload->'card'->'dexId'->>0)::int
),
missing AS (
  SELECT t.card_print_id, f.finish_key
  FROM target t
  CROSS JOIN (VALUES ('reverse'), ('holo')) AS f(finish_key)
  LEFT JOIN public.card_printings cpn
    ON cpn.card_print_id = t.card_print_id
   AND cpn.finish_key = f.finish_key
  WHERE cpn.card_print_id IS NULL
)
SELECT card_print_id, finish_key
FROM missing
ON CONFLICT DO NOTHING;
```

#### Verify normal/reverse/holo presence

```sql
WITH target AS (
  SELECT DISTINCT
    cp.id AS card_print_id
  FROM public.raw_imports ri
  JOIN public.card_prints cp
    ON lower(cp.name) = lower(ri.payload->'card'->>'name')
   AND lower(COALESCE(cp.artist, '')) = lower(COALESCE(ri.payload->'card'->>'illustrator', ''))
  JOIN public.card_print_traits cpt
    ON cpt.card_print_id = cp.id
   AND cpt.trait_type = 'national_dex'
   AND cpt.trait_value ~ '^\d+$'
  WHERE ri.source='tcgdex'
    AND ri.payload->>'_kind'='card'
    AND COALESCE(ri.payload->>'_set_external_id', ri.payload->>'set_external_id') = 'tk-hs-g'
    AND (ri.payload->'card'->'dexId'->>0) ~ '^\d+$'
    AND cpt.trait_value::int = (ri.payload->'card'->'dexId'->>0)::int
)
SELECT
  t.card_print_id,
  COUNT(*) FILTER (WHERE cpn.finish_key IN ('normal','reverse','holo')) AS finish_rows,
  ARRAY_AGG(cpn.finish_key ORDER BY cpn.finish_key) FILTER (WHERE cpn.finish_key IN ('normal','reverse','holo')) AS finish_keys
FROM target t
LEFT JOIN public.card_printings cpn
  ON cpn.card_print_id = t.card_print_id
GROUP BY t.card_print_id;
```

### external_printing_mappings external_id format
- Store finish mapping as: `<tcgdex_external_id>:<finish_key>`
- Example: `tk-hs-g-20:normal`, `tk-hs-g-20:reverse`, `tk-hs-g-20:holo`

#### DRY RUN printing mapping insert (`would_insert=3` on tk-hs-g-20 path)

```sql
WITH tk_rows AS (
  SELECT DISTINCT
    (ri.payload->>'_external_id') AS external_id,
    ri.payload->'card' AS card_json
  FROM public.raw_imports ri
  WHERE ri.source='tcgdex'
    AND ri.payload->>'_kind'='card'
    AND COALESCE(ri.payload->>'_set_external_id', ri.payload->>'set_external_id') = 'tk-hs-g'
    AND (ri.payload->>'_external_id') = 'tk-hs-g-20'
),
resolved AS (
  SELECT
    t.external_id,
    cp.id AS card_print_id,
    COALESCE((t.card_json->'variants'->>'normal')::boolean, true) AS has_normal,
    COALESCE((t.card_json->'variants'->>'reverse')::boolean, false) AS has_reverse,
    COALESCE((t.card_json->'variants'->>'holo')::boolean, false) AS has_holo
  FROM tk_rows t
  JOIN public.card_prints cp
    ON lower(cp.name) = lower(t.card_json->>'name')
   AND lower(COALESCE(cp.artist, '')) = lower(COALESCE(t.card_json->>'illustrator', ''))
  JOIN public.card_print_traits cpt
    ON cpt.card_print_id = cp.id
   AND cpt.trait_type = 'national_dex'
   AND cpt.trait_value ~ '^\d+$'
  WHERE (t.card_json->'dexId'->>0) ~ '^\d+$'
    AND cpt.trait_value::int = (t.card_json->'dexId'->>0)::int
),
expected AS (
  SELECT r.external_id, r.card_print_id, 'normal'::text AS finish_key FROM resolved r WHERE r.has_normal
  UNION ALL
  SELECT r.external_id, r.card_print_id, 'reverse'::text AS finish_key FROM resolved r WHERE r.has_reverse
  UNION ALL
  SELECT r.external_id, r.card_print_id, 'holo'::text AS finish_key FROM resolved r WHERE r.has_holo
),
rows_to_insert AS (
  SELECT
    cpn.id AS card_printing_id,
    e.external_id || ':' || e.finish_key AS external_id_with_finish
  FROM expected e
  JOIN public.card_printings cpn
    ON cpn.card_print_id = e.card_print_id
   AND cpn.finish_key = e.finish_key
  LEFT JOIN public.external_printing_mappings epm
    ON epm.source = 'tcgdex'
   AND epm.external_id = (e.external_id || ':' || e.finish_key)
  WHERE epm.external_id IS NULL
)
SELECT COUNT(*) AS would_insert
FROM rows_to_insert;
```

#### APPLY external_printing_mappings insert

```sql
INSERT INTO public.external_printing_mappings (card_printing_id, source, external_id, active, synced_at, meta)
WITH tk_rows AS (
  SELECT DISTINCT
    (ri.payload->>'_external_id') AS external_id,
    ri.payload->'card' AS card_json
  FROM public.raw_imports ri
  WHERE ri.source='tcgdex'
    AND ri.payload->>'_kind'='card'
    AND COALESCE(ri.payload->>'_set_external_id', ri.payload->>'set_external_id') = 'tk-hs-g'
),
resolved AS (
  SELECT
    t.external_id,
    cp.id AS card_print_id,
    COALESCE((t.card_json->'variants'->>'normal')::boolean, true) AS has_normal,
    COALESCE((t.card_json->'variants'->>'reverse')::boolean, false) AS has_reverse,
    COALESCE((t.card_json->'variants'->>'holo')::boolean, false) AS has_holo
  FROM tk_rows t
  JOIN public.card_prints cp
    ON lower(cp.name) = lower(t.card_json->>'name')
   AND lower(COALESCE(cp.artist, '')) = lower(COALESCE(t.card_json->>'illustrator', ''))
  JOIN public.card_print_traits cpt
    ON cpt.card_print_id = cp.id
   AND cpt.trait_type = 'national_dex'
   AND cpt.trait_value ~ '^\d+$'
  WHERE (t.card_json->'dexId'->>0) ~ '^\d+$'
    AND cpt.trait_value::int = (t.card_json->'dexId'->>0)::int
),
expected AS (
  SELECT r.external_id, r.card_print_id, 'normal'::text AS finish_key FROM resolved r WHERE r.has_normal
  UNION ALL
  SELECT r.external_id, r.card_print_id, 'reverse'::text AS finish_key FROM resolved r WHERE r.has_reverse
  UNION ALL
  SELECT r.external_id, r.card_print_id, 'holo'::text AS finish_key FROM resolved r WHERE r.has_holo
),
rows_to_insert AS (
  SELECT
    cpn.id AS card_printing_id,
    e.external_id || ':' || e.finish_key AS external_id_with_finish
  FROM expected e
  JOIN public.card_printings cpn
    ON cpn.card_print_id = e.card_print_id
   AND cpn.finish_key = e.finish_key
  LEFT JOIN public.external_printing_mappings epm
    ON epm.source = 'tcgdex'
   AND epm.external_id = (e.external_id || ':' || e.finish_key)
  WHERE epm.external_id IS NULL
)
SELECT
  r.card_printing_id,
  'tcgdex',
  r.external_id_with_finish,
  true,
  now(),
  jsonb_build_object('mapping_style', 'tk_finish', 'external_id_format', '<external_id>:<finish_key>')
FROM rows_to_insert r
ON CONFLICT (source, external_id) DO NOTHING;
```

#### Verify 3 rows for `tk-hs-g-20`

```sql
SELECT
  external_id,
  card_printing_id,
  active
FROM public.external_printing_mappings
WHERE source = 'tcgdex'
  AND external_id LIKE 'tk-hs-g-20:%'
ORDER BY external_id;
```

---

## 6) Session Outcomes (Captured)
- `ex5.5` promoted to canonical and closed (5 prints, 5 mappings, dupes 0)
- `fut2020` resolved as alias onto `fut20` (5 alias mappings)
- `tk-hs-g` proof-of-pattern: deterministic join + finish children + printing mappings using `external_id:finish_key`
- Scoreboard fix: use EXISTS to avoid join multiplication
