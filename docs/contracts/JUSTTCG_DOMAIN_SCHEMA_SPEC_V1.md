# JUSTTCG_DOMAIN_SCHEMA_SPEC_V1

Status: LOCKED  
Type: Schema Spec  
Scope: Final proposed database shape for the isolated JustTCG domain  
Authority: Subordinate to `JUSTTCG_DOMAIN_CONTRACT_V1`

---

## 1. Purpose

This spec defines the final proposed database shape for the isolated JustTCG domain before any migration work begins.

It exists to lock:

- exact table names
- exact column names
- exact key and index strategy
- exact constraints
- replay-safe storage expectations

This is a documentation-only artifact. No migration, schema, worker, or UI changes are part of this step.

---

## 2. Design Constraints

The schema defined here must satisfy the following locked constraints:

- JustTCG is non-canonical
- variant dimension must be preserved
- source isolation is mandatory
- no writes to existing pricing tables are allowed
- snapshots are append-only
- latest state is derived from snapshots
- future compatibility with `card_printing_id` must be preserved

Repo-grounded boundary:

- canonical identity remains `public.card_prints`
- current safe attachment point is `external_mappings(source='justtcg')`
- no `justtcg_*` tables currently exist in repo reality

---

## 3. Final Proposed Tables

### 3.1 `public.justtcg_variants`

Purpose:

- store stable JustTCG variant identity rows
- attach each JustTCG variant to the current canonical Grookai `card_print_id`
- preserve upstream variant dimensions without flattening

Exact proposed columns:

- `variant_id text not null`
- `card_print_id uuid not null`
- `condition text not null`
- `printing text not null`
- `language text null`
- `created_at timestamptz not null default now()`

Primary key:

- `primary key (variant_id)`

Foreign key:

- `card_print_id references public.card_prints(id)`

Uniqueness assumptions:

- `variant_id` is the only enforced identity key in v1
- no secondary unique constraint on `(card_print_id, condition, printing, language)` in v1
- reason: upstream label normalization for those dimensions is not yet proven stable enough to make that combination the enforced DB identity

Why `card_print_id` is used now:

- current verified JustTCG attachment is card-level through `external_mappings`
- printing-level canonical attachment is not yet deterministic enough for schema enforcement

Future `card_printing_id` note:

- deferred, not blocked
- this v1 schema intentionally anchors to `card_print_id` only
- a future migration may add `card_printing_id` after deterministic printing-level mapping is proven

---

### 3.2 `public.justtcg_variant_price_snapshots`

Purpose:

- preserve append-only JustTCG variant pricing snapshots over time
- retain the raw upstream payload for replay, audit, and future expansion

Exact proposed columns:

- `id uuid not null default gen_random_uuid()`
- `variant_id text not null`
- `card_print_id uuid not null`
- `price numeric(12,2) null`
- `avg_price numeric(12,2) null`
- `price_change_24h numeric(12,4) null`
- `price_change_7d numeric(12,4) null`
- `fetched_at timestamptz not null`
- `raw_payload jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`

Primary key:

- `primary key (id)`

Foreign keys:

- `variant_id references public.justtcg_variants(variant_id)`
- `card_print_id references public.card_prints(id)`

Append-only rule:

- snapshot rows are insert-only
- no update path is part of the domain contract
- no delete path is part of normal operation

Expected query patterns:

- fetch latest snapshot history for one variant
- fetch recent variant history for one card print
- rebuild latest table deterministically from snapshots

No updates/deletes rule:

- ingestion writes new rows only
- corrections are represented by later snapshots, not mutation of prior rows

---

### 3.3 `public.justtcg_variant_prices_latest`

Purpose:

- provide a derived current-state table with one row per JustTCG variant
- support internal reads without scanning the full snapshot history

Exact proposed columns:

- `variant_id text not null`
- `card_print_id uuid not null`
- `condition text not null`
- `printing text not null`
- `language text null`
- `price numeric(12,2) null`
- `avg_price numeric(12,2) null`
- `price_change_24h numeric(12,4) null`
- `price_change_7d numeric(12,4) null`
- `updated_at timestamptz not null`

Primary key:

- `primary key (variant_id)`

Foreign keys:

- `variant_id references public.justtcg_variants(variant_id)`
- `card_print_id references public.card_prints(id)`

Derived-from-snapshots rule:

- one row per `variant_id`
- table is rebuilt or upserted only from `public.justtcg_variant_price_snapshots`
- it is not an independent source-of-truth table

Direct-write rule:

- direct ingestion writes from raw API payload into `justtcg_variant_prices_latest` are not allowed as an alternative path
- the only valid write path is deterministic derivation from snapshot rows

---

## 4. Data Type Recommendations

All proposed types are repo-specific and chosen to match current patterns already present in this repository.

### `public.justtcg_variants`

- `variant_id`: `text`
  - reason: external IDs in this repo are stored as `text`
- `card_print_id`: `uuid`
  - verified from `public.card_prints.id`
- `condition`: `text`
- `printing`: `text`
- `language`: `text`
- `created_at`: `timestamptz`

### `public.justtcg_variant_price_snapshots`

- `id`: `uuid default gen_random_uuid()`
  - reason: repo already uses UUID PKs for observation/snapshot-style tables
- `variant_id`: `text`
- `card_print_id`: `uuid`
- `price`: `numeric(12,2)`
- `avg_price`: `numeric(12,2)`
- `price_change_24h`: `numeric(12,4)`
- `price_change_7d`: `numeric(12,4)`
- `fetched_at`: `timestamptz`
- `raw_payload`: `jsonb`
- `created_at`: `timestamptz`

### `public.justtcg_variant_prices_latest`

- `variant_id`: `text`
- `card_print_id`: `uuid`
- `condition`: `text`
- `printing`: `text`
- `language`: `text`
- `price`: `numeric(12,2)`
- `avg_price`: `numeric(12,2)`
- `price_change_24h`: `numeric(12,4)`
- `price_change_7d`: `numeric(12,4)`
- `updated_at`: `timestamptz`

---

## 5. Constraints

### `public.justtcg_variants`

Proposed constraints:

- `primary key (variant_id)`
- `foreign key (card_print_id) references public.card_prints(id)`
- `condition is not null`
- `printing is not null`
- `created_at is not null`
- `check (btrim(variant_id) <> '')`
- `check (btrim(condition) <> '')`
- `check (btrim(printing) <> '')`
- `check (language is null or btrim(language) <> '')`

### `public.justtcg_variant_price_snapshots`

Proposed constraints:

- `primary key (id)`
- `foreign key (variant_id) references public.justtcg_variants(variant_id)`
- `foreign key (card_print_id) references public.card_prints(id)`
- `variant_id is not null`
- `card_print_id is not null`
- `fetched_at is not null`
- `raw_payload is not null`
- `created_at is not null`
- `check (btrim(variant_id) <> '')`
- `check (jsonb_typeof(raw_payload) = 'object')`

No uniqueness constraint is proposed on `(variant_id, fetched_at)` in v1.

Reason:

- snapshot storage must remain replay-safe and append-only
- deduplication can be handled in worker logic or a future optional content-hash strategy without narrowing the historical model now

### `public.justtcg_variant_prices_latest`

Proposed constraints:

- `primary key (variant_id)`
- `foreign key (variant_id) references public.justtcg_variants(variant_id)`
- `foreign key (card_print_id) references public.card_prints(id)`
- `card_print_id is not null`
- `condition is not null`
- `printing is not null`
- `updated_at is not null`
- `check (btrim(variant_id) <> '')`
- `check (btrim(condition) <> '')`
- `check (btrim(printing) <> '')`
- `check (language is null or btrim(language) <> '')`

---

## 6. Index Plan

Only indexes with clear query-path justification are proposed in v1.

### `public.justtcg_variants`

- `index on (card_print_id)`
  - reason: fetch all JustTCG variants attached to one canonical card print

### `public.justtcg_variant_price_snapshots`

- `index on (variant_id, fetched_at desc)`
  - reason: latest-history lookup per variant and latest-table rebuilds
- `index on (card_print_id, fetched_at desc)`
  - reason: recent JustTCG history lookup per canonical card print

### `public.justtcg_variant_prices_latest`

- `index on (card_print_id)`
  - reason: internal reads by canonical card print without scanning all variants

Not proposed in v1:

- no condition-only index
- no printing-only index
- no language-only index

Reason:

- those read paths are not yet proven as primary access patterns in current repo reality

---

## 7. Replay / Migration Safety Notes

Migration expectations for this domain:

- replay-safe
- isolated blast radius
- no dependency on existing pricing views
- no dependency on existing eBay tables
- can be dropped safely if rollback is needed

Additional safety notes:

- the proposed tables are source-isolated under `justtcg_*`
- no existing pricing table or view needs to be modified to create them
- rollback is table-local because nothing in the active pricing lane depends on these tables in v1

---

## 8. Open Decisions

Only real unresolved items remain:

### 1. `card_printing_id` is deferred

- current verified mapping is only safe at `card_print_id`
- future printing-level attachment remains intentionally deferred until deterministic printing identity is proven

### 2. Additional upstream analytics fields are deferred

- this v1 spec stores the required surfaced fields plus `raw_payload`
- any extra JustTCG analytics beyond:
  - `price`
  - `avg_price`
  - `price_change_24h`
  - `price_change_7d`
  must stay in `raw_payload` until a later spec explicitly promotes them

These items do not block migration work for the locked v1 schema above.

---

## 9. Final Recommendation

- Schema Spec Status: READY
- Migration Ready: YES
- Blockers: NONE

This schema is precise enough for the next step to be a migration task without renaming the JustTCG domain tables later.
