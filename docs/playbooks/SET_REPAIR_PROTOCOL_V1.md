# SET_REPAIR_PROTOCOL_V1 — Deterministic Canonical Completion + Mapping + Finish + Image Repair

## 0) Definitions / Contracts

- Canonical Print: `public.card_prints`
- Printing Child: `public.card_printings` (`finish_key`)
- Canon Mapping: `public.external_mappings` (`tcgdex external_id -> card_print_id`)
- Printing Mapping: `public.external_printing_mappings` (`tcgdex external_id -> card_printing_id`)
- Finish taxonomy: `public.finish_keys`

Rule of Thumb (LOCKED):
- Collector number changes -> separate canonical row (`card_prints`)
- Collector number same, finish changes -> printing child (`card_printings`)

Explicit separations (LOCKED):
- Canon mappings (`external_mappings`) are not printing mappings (`external_printing_mappings`).
- Canon identity is `(set_id, number_plain, variant_key)`; finish identity is `(card_print_id, finish_key)`.
- Set routing chooses canonical target set; lane routing chooses join strategy within a set.

---

## 1) STOP RULES (Hard)

STOP immediately when any condition is true:
- Any join requires guessing and has no deterministic key.
- Unique collision occurs on `uq_card_prints_identity`.
- Subset lane (`TG`, `RC`, other prefix lanes) has no deterministic canonical route.
- Image repair source is not authoritative (`tcgdex_cards` or equivalent upstream staging).

Pass criteria:
- No STOP rule triggered for the entire repair transaction set.

---

## 2) Primary Scoreboards (Truth)

### 2.1 Canon-only scoreboard (legacy; may show missing when printing mappings exist)

Goal:
- Report legacy canon-only mapping status.

Stop conditions:
- Source rows are not present in `raw_imports` for target set.

SQL template (references Section 2.2 output):
```sql
WITH v2 AS (
  -- Use the Section 2.2 query body unchanged.
  WITH params AS (
    SELECT '<SET_CODE>'::text AS set_code, 'tcgdex'::text AS source_name
  ),
  raws AS (
    SELECT DISTINCT
      (ri.payload->>'_external_id') AS external_id
    FROM public.raw_imports ri
    JOIN params p ON true
    WHERE ri.source = p.source_name
      AND ri.payload->>'_kind' = 'card'
      AND COALESCE(ri.payload->>'_set_external_id', ri.payload->>'set_external_id') = p.set_code
      AND ri.payload ? '_external_id'
  ),
  coverage AS (
    SELECT
      r.external_id,
      EXISTS (
        SELECT 1
        FROM public.external_mappings em
        JOIN params p ON true
        WHERE em.source = p.source_name
          AND em.external_id = r.external_id
      ) AS has_canon
    FROM raws r
  )
  SELECT
    COUNT(*) AS raw_cards,
    COUNT(*) FILTER (WHERE has_canon) AS mapped_canon,
    COUNT(*) FILTER (WHERE NOT has_canon) AS still_missing_canon_only
  FROM coverage
)
SELECT * FROM v2;
```

Pass criteria:
- Legacy-only metric accepted as informational.
- Final closure still uses Section 2.2 (`still_unmapped = 0`).

### 2.2 Coverage scoreboard v2 (canon + printing)

Goal:
- Compute final truth coverage across canon and printing mappings.

Stop conditions:
- `raw_cards = 0` for target set scope.

SQL template:
```sql
WITH params AS (
  SELECT '<SET_CODE>'::text AS set_code, 'tcgdex'::text AS source_name
),
raws AS (
  SELECT DISTINCT
    (ri.payload->>'_external_id') AS external_id
  FROM public.raw_imports ri
  JOIN params p ON true
  WHERE ri.source = p.source_name
    AND ri.payload->>'_kind' = 'card'
    AND COALESCE(ri.payload->>'_set_external_id', ri.payload->>'set_external_id') = p.set_code
    AND ri.payload ? '_external_id'
),
coverage AS (
  SELECT
    r.external_id,
    EXISTS (
      SELECT 1
      FROM public.external_mappings em
      JOIN params p ON true
      WHERE em.source = p.source_name
        AND em.external_id = r.external_id
    ) AS has_canon,
    EXISTS (
      SELECT 1
      FROM public.external_printing_mappings epm
      JOIN params p ON true
      WHERE epm.source = p.source_name
        AND epm.external_id = r.external_id
    ) AS has_printing
  FROM raws r
)
SELECT
  COUNT(*) AS raw_cards,
  COUNT(*) FILTER (WHERE has_canon) AS mapped_canon,
  COUNT(*) FILTER (WHERE has_printing) AS mapped_printing,
  COUNT(*) FILTER (WHERE NOT has_canon AND NOT has_printing) AS still_unmapped
FROM coverage;
```

Pass criteria:
- `still_unmapped = 0`

---

## 3) Set Repair Decision Tree (Deterministic)

Goal:
- Choose one and only one deterministic repair lane.

Stop conditions:
- Lane classification cannot be determined from `localId`.

SQL template: missing list + lane classification
```sql
WITH params AS (
  SELECT '<SET_CODE>'::text AS set_code, 'tcgdex'::text AS source_name
),
missing AS (
  SELECT
    (ri.payload->>'_external_id') AS external_id,
    (ri.payload->'card'->>'localId') AS local_id,
    COALESCE(ri.payload->'card'->>'name', ri.payload->>'name') AS name,
    (ri.payload->'card'->'variants') AS variants
  FROM public.raw_imports ri
  JOIN params p ON true
  WHERE ri.source = p.source_name
    AND ri.payload->>'_kind' = 'card'
    AND COALESCE(ri.payload->>'_set_external_id', ri.payload->>'set_external_id') = p.set_code
    AND NOT EXISTS (
      SELECT 1
      FROM public.external_mappings em
      WHERE em.source = p.source_name
        AND em.external_id = (ri.payload->>'_external_id')
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.external_printing_mappings epm
      WHERE epm.source = p.source_name
        AND epm.external_id = (ri.payload->>'_external_id')
    )
)
SELECT
  external_id,
  local_id,
  name,
  variants,
  CASE
    WHEN local_id ~ '^\d+$' THEN 'numeric_lane'
    WHEN local_id ~ '^[A-Za-z]+[0-9]+$' OR local_id ~ '^TG[0-9]+$' THEN 'prefix_lane'
    WHEN local_id ~ '^\d+[a-z]+$' THEN 'suffix_lane'
    ELSE 'unclassified'
  END AS lane
FROM missing
ORDER BY local_id, external_id;
```

Deterministic routing:
- If canonical prints exist and `still_unmapped > 0`: run lane-specific repair.
- If `canonical_prints = 0`: route to `CANON_COMPLETION_PROTOCOL_V1` (out of scope here).

Pass criteria:
- Every missing row is lane-classified and assigned a deterministic next lane.

---

## 4) TG / Subset Routing Rule (Lane Routing)

Goal:
- Route TG lane emitted under base set into subset canonical set (`swsh12tg`-style).

Stop conditions:
- Target subset set code does not exist in `public.sets`.
- TG lane join (`cp.number = localId`) returns ambiguous candidates.

DRY RUN TG mapping query template:
```sql
WITH params AS (
  SELECT
    '<BASE_SET_CODE>'::text AS base_set_code,
    '<ROUTED_SET_CODE>'::text AS routed_set_code,
    'tcgdex'::text AS source_name
),
raw_tg AS (
  SELECT
    (ri.payload->>'_external_id') AS external_id,
    (ri.payload->'card'->>'localId') AS local_id
  FROM public.raw_imports ri
  JOIN params p ON true
  WHERE ri.source = p.source_name
    AND ri.payload->>'_kind' = 'card'
    AND COALESCE(ri.payload->>'_set_external_id', ri.payload->>'set_external_id') = p.base_set_code
    AND (ri.payload->'card'->>'localId') ~ '^TG[0-9]+$'
    AND NOT EXISTS (
      SELECT 1 FROM public.external_mappings em
      WHERE em.source = p.source_name
        AND em.external_id = (ri.payload->>'_external_id')
    )
),
canon_tg AS (
  SELECT
    cp.id AS card_print_id,
    cp.number
  FROM public.card_prints cp
  JOIN public.sets s ON s.id = cp.set_id
  JOIN params p ON true
  WHERE s.code = p.routed_set_code
)
SELECT
  c.card_print_id,
  r.external_id,
  r.local_id
FROM raw_tg r
JOIN canon_tg c
  ON c.number = r.local_id
ORDER BY r.local_id;
```

APPLY TG mapping insert template:
```sql
INSERT INTO public.external_mappings (card_print_id, source, external_id, active, synced_at, meta)
WITH params AS (
  SELECT
    '<BASE_SET_CODE>'::text AS base_set_code,
    '<ROUTED_SET_CODE>'::text AS routed_set_code,
    'tcgdex'::text AS source_name
),
raw_tg AS (
  SELECT
    (ri.payload->>'_external_id') AS external_id,
    (ri.payload->'card'->>'localId') AS local_id
  FROM public.raw_imports ri
  JOIN params p ON true
  WHERE ri.source = p.source_name
    AND ri.payload->>'_kind' = 'card'
    AND COALESCE(ri.payload->>'_set_external_id', ri.payload->>'set_external_id') = p.base_set_code
    AND (ri.payload->'card'->>'localId') ~ '^TG[0-9]+$'
    AND NOT EXISTS (
      SELECT 1 FROM public.external_mappings em
      WHERE em.source = p.source_name
        AND em.external_id = (ri.payload->>'_external_id')
    )
),
canon_tg AS (
  SELECT
    cp.id AS card_print_id,
    cp.number
  FROM public.card_prints cp
  JOIN public.sets s ON s.id = cp.set_id
  JOIN params p ON true
  WHERE s.code = p.routed_set_code
)
SELECT
  c.card_print_id,
  (SELECT source_name FROM params),
  r.external_id,
  true,
  now(),
  jsonb_build_object(
    'routed_from_set', (SELECT base_set_code FROM params),
    'routed_to_set', (SELECT routed_set_code FROM params),
    'lane', 'tg_prefix'
  )
FROM raw_tg r
JOIN canon_tg c
  ON c.number = r.local_id
ON CONFLICT (source, external_id) DO NOTHING;
```

Pass criteria:
- TG external IDs exist in `external_mappings` and point to `card_print_id` under routed subset set.

---

## 5) Multi-letter Prefix Lane Isolation (RC-type collision)

Goal:
- Isolate multi-letter prefix namespace (`RC`) with `variant_key` to prevent numeric-lane identity collisions.

Stop conditions:
- Update target includes rows outside intended prefix lane.
- Any write attempt collides with `uq_card_prints_identity`.

RC inventory audit query:
```sql
WITH lane AS (
  SELECT
    cp.id,
    s.code AS set_code,
    cp.number,
    cp.number_plain,
    COALESCE(cp.variant_key, '') AS variant_key
  FROM public.card_prints cp
  JOIN public.sets s ON s.id = cp.set_id
  WHERE s.code = '<SET_CODE>'
)
SELECT
  number_plain,
  COUNT(*) AS row_count,
  COUNT(*) FILTER (WHERE number ~ '^RC[0-9]+$') AS rc_rows,
  COUNT(*) FILTER (WHERE number ~ '^[0-9]+$') AS numeric_rows
FROM lane
GROUP BY number_plain
HAVING COUNT(*) FILTER (WHERE number ~ '^RC[0-9]+$') > 0
ORDER BY number_plain::int NULLS LAST;
```

Transactional update query + verification:
```sql
BEGIN;

UPDATE public.card_prints cp
SET variant_key = 'rc',
    updated_at = now()
FROM public.sets s
WHERE cp.set_id = s.id
  AND s.code = '<SET_CODE>'
  AND cp.number ~ '^RC[0-9]+$'
  AND COALESCE(cp.variant_key, '') = '';

SELECT
  COUNT(*) FILTER (WHERE cp.number ~ '^RC[0-9]+$' AND COALESCE(cp.variant_key,'') = 'rc') AS rc_isolated,
  COUNT(*) FILTER (WHERE cp.number ~ '^RC[0-9]+$' AND COALESCE(cp.variant_key,'') = '') AS rc_unisolated
FROM public.card_prints cp
JOIN public.sets s ON s.id = cp.set_id
WHERE s.code = '<SET_CODE>';

COMMIT;
```

Generated-column doctrine:
- Do not alter generated `number_plain` in this protocol.
- Prefix lane isolation is done with `variant_key`.

Pass criteria:
- All RC rows in target set have `variant_key = 'rc'`.
- Numeric lane inserts no longer collide with RC namespace.

---

## 6) Canonical Completion (Numeric lane inserts)

Goal:
- Insert missing numeric canonical prints only when truly absent.

Stop conditions:
- Hard gate finds existing canonical rows for the exact target numbers.
- Insert attempt includes `number_plain` column (forbidden).

Hard gate query: existing canonical numbers
```sql
WITH params AS (
  SELECT '<SET_CODE>'::text AS set_code, 'tcgdex'::text AS source_name
),
raw_numeric AS (
  SELECT DISTINCT
    (ri.payload->'card'->>'localId') AS local_id
  FROM public.raw_imports ri
  JOIN params p ON true
  WHERE ri.source = p.source_name
    AND ri.payload->>'_kind' = 'card'
    AND COALESCE(ri.payload->>'_set_external_id', ri.payload->>'set_external_id') = p.set_code
    AND (ri.payload->'card'->>'localId') ~ '^[0-9]+$'
)
SELECT
  cp.id,
  cp.number,
  cp.number_plain,
  COALESCE(cp.variant_key,'') AS variant_key
FROM public.card_prints cp
JOIN public.sets s ON s.id = cp.set_id
JOIN raw_numeric rn ON rn.local_id = cp.number
WHERE s.code = '<SET_CODE>'
ORDER BY cp.number;
```

Insert template (without `number_plain`):
```sql
INSERT INTO public.card_prints (set_id, name, number, rarity)
WITH params AS (
  SELECT '<SET_CODE>'::text AS set_code, 'tcgdex'::text AS source_name
),
set_row AS (
  SELECT s.id AS set_id
  FROM public.sets s
  JOIN params p ON true
  WHERE s.code = p.set_code
),
raw_numeric AS (
  SELECT DISTINCT
    (ri.payload->'card'->>'localId') AS local_id,
    COALESCE(ri.payload->'card'->>'name', ri.payload->>'name') AS card_name,
    NULLIF(ri.payload->'card'->>'rarity', '') AS rarity
  FROM public.raw_imports ri
  JOIN params p ON true
  WHERE ri.source = p.source_name
    AND ri.payload->>'_kind' = 'card'
    AND COALESCE(ri.payload->>'_set_external_id', ri.payload->>'set_external_id') = p.set_code
    AND (ri.payload->'card'->>'localId') ~ '^[0-9]+$'
),
to_insert AS (
  SELECT
    sr.set_id,
    rn.card_name AS name,
    rn.local_id AS number,
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
  ti.set_id,
  ti.name,
  ti.number,
  ti.rarity
FROM to_insert ti
RETURNING id, number, number_plain, name, rarity;
```

Verify query:
```sql
SELECT
  cp.number,
  cp.number_plain,
  cp.name,
  cp.rarity
FROM public.card_prints cp
JOIN public.sets s ON s.id = cp.set_id
WHERE s.code = '<SET_CODE>'
  AND cp.number ~ '^[0-9]+$'
ORDER BY cp.number_plain::int;
```

Pass criteria:
- `inserted_rows = expected count`
- `number_plain` is generated automatically and populated correctly.

---

## 7) Canon Mapping Backfill (Numeric lane)

Goal:
- Backfill canonical external mappings for numeric lane using integer join semantics.

Stop conditions:
- Join is non-deterministic (multiple canon matches per external_id).

DRY RUN (`localId::int = number_plain::int`):
```sql
WITH params AS (
  SELECT '<SET_CODE>'::text AS set_code, 'tcgdex'::text AS source_name
),
tcgdex_missing AS (
  SELECT
    (ri.payload->>'_external_id') AS external_id,
    (ri.payload->'card'->>'localId') AS local_id
  FROM public.raw_imports ri
  JOIN params p ON true
  WHERE ri.source = p.source_name
    AND ri.payload->>'_kind' = 'card'
    AND COALESCE(ri.payload->>'_set_external_id', ri.payload->>'set_external_id') = p.set_code
    AND (ri.payload->'card'->>'localId') ~ '^[0-9]+$'
    AND NOT EXISTS (
      SELECT 1
      FROM public.external_mappings em
      WHERE em.source = p.source_name
        AND em.external_id = (ri.payload->>'_external_id')
    )
),
canon AS (
  SELECT
    cp.id AS card_print_id,
    cp.number_plain
  FROM public.card_prints cp
  JOIN public.sets s ON s.id = cp.set_id
  WHERE s.code = '<SET_CODE>'
    AND cp.number_plain ~ '^[0-9]+$'
)
SELECT
  c.card_print_id,
  r.external_id,
  r.local_id,
  c.number_plain
FROM tcgdex_missing r
JOIN canon c
  ON r.local_id::int = c.number_plain::int
ORDER BY r.external_id;
```

APPLY insert:
```sql
INSERT INTO public.external_mappings (card_print_id, source, external_id, active, synced_at, meta)
WITH params AS (
  SELECT '<SET_CODE>'::text AS set_code, 'tcgdex'::text AS source_name
),
tcgdex_missing AS (
  SELECT
    (ri.payload->>'_external_id') AS external_id,
    (ri.payload->'card'->>'localId') AS local_id
  FROM public.raw_imports ri
  JOIN params p ON true
  WHERE ri.source = p.source_name
    AND ri.payload->>'_kind' = 'card'
    AND COALESCE(ri.payload->>'_set_external_id', ri.payload->>'set_external_id') = p.set_code
    AND (ri.payload->'card'->>'localId') ~ '^[0-9]+$'
    AND NOT EXISTS (
      SELECT 1
      FROM public.external_mappings em
      WHERE em.source = p.source_name
        AND em.external_id = (ri.payload->>'_external_id')
    )
),
canon AS (
  SELECT
    cp.id AS card_print_id,
    cp.number_plain
  FROM public.card_prints cp
  JOIN public.sets s ON s.id = cp.set_id
  WHERE s.code = '<SET_CODE>'
    AND cp.number_plain ~ '^[0-9]+$'
)
SELECT
  c.card_print_id,
  (SELECT source_name FROM params),
  r.external_id,
  true,
  now(),
  jsonb_build_object('join', 'localId::int = number_plain::int')
FROM tcgdex_missing r
JOIN canon c
  ON r.local_id::int = c.number_plain::int
ON CONFLICT (source, external_id) DO NOTHING;
```

Verify:
```sql
-- Canon-only legacy check
WITH params AS (
  SELECT '<SET_CODE>'::text AS set_code, 'tcgdex'::text AS source_name
),
raws AS (
  SELECT DISTINCT (ri.payload->>'_external_id') AS external_id
  FROM public.raw_imports ri
  JOIN params p ON true
  WHERE ri.source = p.source_name
    AND ri.payload->>'_kind' = 'card'
    AND COALESCE(ri.payload->>'_set_external_id', ri.payload->>'set_external_id') = p.set_code
)
SELECT
  COUNT(*) FILTER (WHERE em.external_id IS NULL) AS still_missing
FROM raws r
LEFT JOIN public.external_mappings em
  ON em.source = (SELECT source_name FROM params)
 AND em.external_id = r.external_id;
```

Pass criteria:
- Canon-only `still_missing = 0`
- Section 2.2 scoreboard `still_unmapped = 0`

---

## 8) Finish Layer: Reverse printing generation (Display-correct)

Goal:
- Materialize reverse finish as printing children; do not create new canonical rows.

Stop conditions:
- Required finish key (`reverse`) missing from `public.finish_keys`.
- Candidate set includes unmapped canon rows for reverse-marked upstream cards.

Count missing reverse children query:
```sql
WITH params AS (
  SELECT '<SET_CODE>'::text AS set_code, 'tcgdex'::text AS source_name
),
reverse_candidates AS (
  SELECT DISTINCT em.card_print_id
  FROM public.raw_imports ri
  JOIN params p ON true
  JOIN public.external_mappings em
    ON em.source = p.source_name
   AND em.external_id = (ri.payload->>'_external_id')
  WHERE ri.source = p.source_name
    AND ri.payload->>'_kind' = 'card'
    AND COALESCE(ri.payload->>'_set_external_id', ri.payload->>'set_external_id') = p.set_code
    AND COALESCE((ri.payload->'card'->'variants'->>'reverse')::boolean, false) = true
),
missing AS (
  SELECT rc.card_print_id
  FROM reverse_candidates rc
  LEFT JOIN public.card_printings cpn
    ON cpn.card_print_id = rc.card_print_id
   AND cpn.finish_key = 'reverse'
  WHERE cpn.card_print_id IS NULL
)
SELECT COUNT(*) AS reverse_printings_still_missing
FROM missing;
```

APPLY insert (`ON CONFLICT DO NOTHING`):
```sql
INSERT INTO public.card_printings (card_print_id, finish_key)
WITH params AS (
  SELECT '<SET_CODE>'::text AS set_code, 'tcgdex'::text AS source_name
),
reverse_candidates AS (
  SELECT DISTINCT em.card_print_id
  FROM public.raw_imports ri
  JOIN params p ON true
  JOIN public.external_mappings em
    ON em.source = p.source_name
   AND em.external_id = (ri.payload->>'_external_id')
  WHERE ri.source = p.source_name
    AND ri.payload->>'_kind' = 'card'
    AND COALESCE(ri.payload->>'_set_external_id', ri.payload->>'set_external_id') = p.set_code
    AND COALESCE((ri.payload->'card'->'variants'->>'reverse')::boolean, false) = true
)
SELECT
  rc.card_print_id,
  'reverse'::text
FROM reverse_candidates rc
ON CONFLICT DO NOTHING;
```

Verify missing count:
```sql
WITH params AS (
  SELECT '<SET_CODE>'::text AS set_code, 'tcgdex'::text AS source_name
),
reverse_candidates AS (
  SELECT DISTINCT em.card_print_id
  FROM public.raw_imports ri
  JOIN params p ON true
  JOIN public.external_mappings em
    ON em.source = p.source_name
   AND em.external_id = (ri.payload->>'_external_id')
  WHERE ri.source = p.source_name
    AND ri.payload->>'_kind' = 'card'
    AND COALESCE(ri.payload->>'_set_external_id', ri.payload->>'set_external_id') = p.set_code
    AND COALESCE((ri.payload->'card'->'variants'->>'reverse')::boolean, false) = true
)
SELECT
  COUNT(*) FILTER (WHERE cpn.card_print_id IS NULL) AS reverse_printings_still_missing
FROM reverse_candidates rc
LEFT JOIN public.card_printings cpn
  ON cpn.card_print_id = rc.card_print_id
 AND cpn.finish_key = 'reverse';
```

Optional gate: rarity breakdown for reverse candidates
```sql
WITH params AS (
  SELECT '<SET_CODE>'::text AS set_code, 'tcgdex'::text AS source_name
),
reverse_candidates AS (
  SELECT DISTINCT em.card_print_id
  FROM public.raw_imports ri
  JOIN params p ON true
  JOIN public.external_mappings em
    ON em.source = p.source_name
   AND em.external_id = (ri.payload->>'_external_id')
  WHERE ri.source = p.source_name
    AND ri.payload->>'_kind' = 'card'
    AND COALESCE(ri.payload->>'_set_external_id', ri.payload->>'set_external_id') = p.set_code
    AND COALESCE((ri.payload->'card'->'variants'->>'reverse')::boolean, false) = true
)
SELECT cp.rarity, COUNT(*) AS reverse_candidates
FROM reverse_candidates rc
JOIN public.card_prints cp ON cp.id = rc.card_print_id
GROUP BY cp.rarity
ORDER BY reverse_candidates DESC, cp.rarity;
```

Pass criteria:
- `reverse_printings_still_missing = 0`

---

## 9) Printing-Level External IDs (Suffix/Weird IDs)

Goal:
- Route suffix aliases (`50a`, `50b`) to printing mappings when they are not new collector numbers.

Stop conditions:
- Fingerprints differ after normalization.
- Deterministic base printing target cannot be resolved.

Fingerprint rule SQL (exclude `id`, `localId`, `image`, `set`, `pricing`, `updated`):
```sql
WITH raw_cards AS (
  SELECT
    (ri.payload->>'_external_id') AS external_id,
    (ri.payload->'card') AS card_json
  FROM public.raw_imports ri
  WHERE ri.source = 'tcgdex'
    AND ri.payload->>'_kind' = 'card'
    AND (ri.payload->>'_external_id') IN ('<BASE_EXTERNAL_ID>', '<SUFFIX_EXTERNAL_ID>')
),
fp AS (
  SELECT
    external_id,
    md5(
      jsonb_strip_nulls(
        (card_json - 'id' - 'localId' - 'image' - 'set' - 'pricing' - 'updated')
      )::text
    ) AS fingerprint
  FROM raw_cards
)
SELECT * FROM fp ORDER BY external_id;
```

Alias mapping apply template (fingerprints must match):
```sql
INSERT INTO public.external_printing_mappings (card_printing_id, source, external_id, active, synced_at, meta)
WITH base_printing AS (
  SELECT cpn.id AS card_printing_id
  FROM public.external_mappings em
  JOIN public.card_printings cpn
    ON cpn.card_print_id = em.card_print_id
   AND cpn.finish_key = 'reverse'
  WHERE em.source = 'tcgdex'
    AND em.external_id = '<BASE_EXTERNAL_ID>'
)
SELECT
  bp.card_printing_id,
  'tcgdex'::text,
  '<SUFFIX_EXTERNAL_ID>'::text,
  true,
  now(),
  jsonb_build_object('alias_of', '<BASE_EXTERNAL_ID>', 'reason', 'suffix_alias_same_fingerprint')
FROM base_printing bp
ON CONFLICT (source, external_id) DO NOTHING;
```

Deterministic handling:
- Fingerprints identical -> map suffix ID as printing alias.
- Fingerprints different -> STOP and escalate to `VARIANT_MODELING_PROTOCOL`.

Pass criteria:
- Suffix external IDs are present in `external_printing_mappings` and point to intended printing children.

---

## 10) Image Contamination Repair (TG path pollution)

Goal:
- Repair contaminated numeric-lane `image_url` values that contain TG path fragments.

Stop conditions:
- `tcgdex_cards` authoritative row not found for required `tcgdex_set_id + local_number`.

Column discovery note (LOCKED):
- `tcgdex_cards` uses `local_number` (padded), not `local_id`.

DRY RUN before/after query:
```sql
WITH params AS (
  SELECT '<SET_CODE>'::text AS set_code
),
contaminated AS (
  SELECT
    cp.id AS card_print_id,
    cp.number,
    cp.number_plain,
    cp.image_url AS old_image_url,
    tc.image_url || '/high.webp' AS new_image_url
  FROM public.card_prints cp
  JOIN public.sets s ON s.id = cp.set_id
  JOIN params p ON true
  JOIN public.tcgdex_cards tc
    ON tc.tcgdex_set_id = p.set_code
   AND tc.lang = 'en'
   AND tc.local_number = lpad(cp.number_plain, 3, '0')
  WHERE s.code = p.set_code
    AND cp.number_plain ~ '^[0-9]+$'
    AND cp.image_url ILIKE '%/TG%'
)
SELECT *
FROM contaminated
ORDER BY number_plain::int;
```

APPLY update query:
```sql
BEGIN;

WITH params AS (
  SELECT '<SET_CODE>'::text AS set_code
),
contaminated AS (
  SELECT
    cp.id AS card_print_id,
    tc.image_url || '/high.webp' AS new_image_url
  FROM public.card_prints cp
  JOIN public.sets s ON s.id = cp.set_id
  JOIN params p ON true
  JOIN public.tcgdex_cards tc
    ON tc.tcgdex_set_id = p.set_code
   AND tc.lang = 'en'
   AND tc.local_number = lpad(cp.number_plain, 3, '0')
  WHERE s.code = p.set_code
    AND cp.number_plain ~ '^[0-9]+$'
    AND cp.image_url ILIKE '%/TG%'
)
UPDATE public.card_prints cp
SET image_url = c.new_image_url,
    image_source = 'tcgdex',
    updated_at = now()
FROM contaminated c
WHERE cp.id = c.card_print_id
  AND cp.image_url IS DISTINCT FROM c.new_image_url;

COMMIT;
```

Verify contamination cleared:
```sql
SELECT
  COUNT(*) AS still_bad
FROM public.card_prints cp
JOIN public.sets s ON s.id = cp.set_id
WHERE s.code = '<SET_CODE>'
  AND cp.number_plain ~ '^[0-9]+$'
  AND cp.image_url ILIKE '%/TG%';
```

Pass criteria:
- `still_bad = 0`

---

## 11) Closure Checklist (Set DONE)

Goal:
- Declare deterministic closure for a repaired set.

Stop conditions:
- Any checklist item fails.

Checklist:
- Coverage scoreboard v2: `still_unmapped = 0` for base set and routed subset scope.
- Reverse finish closure: `reverse_printings_still_missing = 0` when upstream marks reverse variants.
- Image contamination closure: `still_bad = 0` when known contamination pattern exists.
- No STOP rules were triggered.

Pass criteria:
- All checklist items pass.

CLOSED ledger entry template:
```md
| closed_at_utc | set_code | routed_sets | score_v2_still_unmapped | reverse_missing | image_still_bad | operator | notes |
|---|---|---|---:|---:|---:|---|---|
| <YYYY-MM-DDTHH:MM:SSZ> | <SET_CODE> | <comma-separated or none> | 0 | 0 | 0 | <name> | SET_REPAIR_PROTOCOL_V1 completed |
```

---

## 12) Appendix — Known Gotchas from 2026-02 Session

- `number_plain` is generated; never insert into it.
- TG subsets can be stored as separate sets (`swsh12tg`, `swsh9tg`) and require explicit routing.
- RC multi-letter prefix collapses to digits in generated `number_plain`; isolate with `variant_key` lane.
- Coverage scoreboard v1 becomes outdated once printing mappings are introduced.
- `tcgdex_cards.local_number` is padded (for example `010`), and repaired `card_prints.image_url` must use `tcgdex_cards.image_url || '/high.webp'`.
