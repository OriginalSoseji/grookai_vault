## RAW_IMPORTS Ingestion Audit (L2)

This is a read-only audit of the shared `raw_imports` staging table. PokemonAPI card normalization is now complete; before we archive or rebuild any other lanes, this document inventories the table and outlines safe, reviewable cleanup paths. No destructive actions are proposed or executed here.

### 1. Table Overview
- **Purpose:** Staging for external/AI/raw payloads before normalization into canonical tables. Rows are scoped by `source`, `_kind` (inside `payload`), and `status`.
- **Definition (from `supabase/migrations/20251115040000_ai_ingestion_schema_v1.sql`):**
  - `raw_imports` (
    - `id` bigserial primary key
    - `payload` jsonb not null
    - `source` text not null (e.g., `pokemonapi`, `justtcg`, `ai_scan`)
    - `status` text not null default `'pending'` (comments mention `pending`, `processed`, `failed`, `ai_review`; workers also use `normalized`, `conflict`, `error`)
    - `ingested_at` timestamptz not null default `now()`
    - `processed_at` timestamptz
    - `notes` text
  - Indexes: `raw_imports_status_idx` on `(status)`; `raw_imports_ingested_at_idx` on `(ingested_at)`.
- **Downstream references (brief):** `mapping_conflicts.raw_import_id` (ON DELETE CASCADE) and normalization workers that move staged data into canonical tables (`card_prints`, traits, etc.). Focus here remains on `raw_imports` itself.

### 2. Inventory Queries (to run in Supabase Studio)
Paste these directly into Supabase Studio to capture the current state.

**a) Full inventory by source/kind/status**
```sql
select
  source,
  payload->>'_kind' as kind,
  status,
  count(*) as row_count
from raw_imports
group by source, kind, status
order by source, kind, status;
```

**b) PokemonAPI-only breakdown**
```sql
select
  payload->>'_kind' as kind,
  status,
  count(*) as row_count
from raw_imports
where source = 'pokemonapi'
group by kind, status
order by kind, status;
```

**c) Non-PokemonAPI breakdown**
```sql
select
  source,
  payload->>'_kind' as kind,
  status,
  count(*) as row_count
from raw_imports
where source <> 'pokemonapi'
group by source, kind, status
order by source, kind, status;
```

**d) Rows outside the normal lifecycle (neither pending nor normalized)**
```sql
select
  source,
  payload->>'_kind' as kind,
  status,
  count(*) as row_count
from raw_imports
where status not in ('pending', 'normalized')
group by source, kind, status
order by source, kind, status;
```

> Paste the results of these queries below in the “Current Inventory Snapshot” section whenever you run this audit.

### 3. Current Inventory Snapshot (Paste Results Here)
Run the queries above and paste the outputs here (tables or screenshots). Do not fabricate numbers.

**Full inventory by source/kind/status**

| source | kind | status | row_count |
| ------ | ---- | ------ | --------- |
| (paste results from query a) |

**PokemonAPI-only breakdown**

| kind | status | row_count |
| ---- | ------ | --------- |
| (paste results from query b) |

**Non-PokemonAPI breakdown**

| source | kind | status | row_count |
| ------ | ---- | ------ | --------- |
| (paste results from query c) |

**Rows outside pending/normalized**

| source | kind | status | row_count |
| ------ | ---- | ------ | --------- |
| (paste results from query d) |

### 4. Classification by Lane (Authoritative vs Legacy)
For each distinct `(source, kind)` lane discovered, classify it before any cleanup. Use the template below per lane.

#### (source = ???, kind = ???)

- [ ] Authoritative (keep + rebuild via proper pipeline)
- [ ] Legacy (safe to retire after new pipeline exists)
- [ ] Unknown (needs investigation)

Notes:
- Intended use:
- Known pipelines/workers:
- Related tables:
- Decision (once finalized):

### 5. Audit Rule L2 Summary (Existing / Partial / Missing / Risks / Env / Safe Areas / Red Flags)
- **Existing:**
  - `raw_imports` as the shared staging table for external/AI payloads.
  - PokemonAPI sets/cards normalized via current worker.
- **Partial:**
  - Legacy or experimental lanes may exist without clear ownership.
  - Mixed status semantics (`pending`, `normalized`, `conflict`, `error`, `processed`, `failed`, `ai_review`) across workers.
- **Missing:**
  - Finalized classification per `(source, kind)` lane.
  - Documented rebuild/retire decisions and SLAs per lane.
- **Risks:**
  - Legacy data treated as authoritative.
  - Pipelines accidentally writing to or reading from deprecated lanes.
  - Ambiguous status values complicating monitoring.
- **Env:**
  - Supabase-backed staging; no secrets included here. Run inventory in the target environment (staging/prod as appropriate).
- **Safe areas:**
  - PokemonAPI lanes are canonical and can serve as the reference pattern for normalization and conflict handling.
- **Red flags:**
  - Any lane lacking an owning pipeline/worker or documentation.
  - Non-standard statuses or stalled rows accumulating outside `pending`/`normalized`.

### 6. Future Cleanup Plan (DO NOT RUN YET)
This section contains example SQL templates only. Do not execute without explicit review/approval.

```sql
-- EXAMPLE ONLY — DO NOT RUN WITHOUT EXPLICIT REVIEW
-- Archive all legacy rows for a given source/kind by marking status = 'archived'
-- update raw_imports
-- set status = 'archived'
-- where source = 'SOME_LEGACY_SOURCE'
--   and payload->>'_kind' = 'SOME_KIND';

-- EXAMPLE ONLY — DO NOT RUN WITHOUT EXPLICIT REVIEW
-- Hard delete rows for a clearly obsolete lane
-- delete from raw_imports
-- where source = 'SOME_OBSOLETE_SOURCE'
--   and payload->>'_kind' = 'SOME_KIND';
```

Checklist before any cleanup:
- [ ] Inventory filled with real data
- [ ] Each (source, kind) classified
- [ ] Cleanup plan agreed
- [ ] Separate “cleanup” Codex task created for actual UPDATE/DELETE

### 7. Next Actions
- Run the inventory queries in Supabase Studio.
- Paste results into Section 3.
- Classify each lane in Section 4.
- Review Risks/Red flags and prepare a targeted cleanup plan (separate Codex task). 
