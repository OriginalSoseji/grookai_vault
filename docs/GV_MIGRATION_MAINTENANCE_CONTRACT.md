# Grookai Vault — Migration Maintenance Contract (v1)
_November 2025_

This document defines how schema changes must be made and validated for Grookai Vault.
The goal is to **never** repeat the migration drift and shadow DB errors we just fixed.

## Migration Drift Guardrail (No-Drift Rule)

- The only source of truth for schema is `supabase/migrations` in git.
- Schema changes never happen directly in Studio or via ad-hoc SQL; they only happen via migrations.
- Before any `supabase db push`, we must run `supabase migration list` and confirm there are no remote-only migrations.

### No-Drift Checklist (Run Before Any `supabase db push`)

1. `supabase migration list`
2. Confirm:
   - No rows where **Remote has a version and Local is blank** (remote-only drift).
   - Local-only rows are exactly the new migrations you intend to push.
3. If remote-only drift exists:
   - STOP.
   - Use `supabase migration repair` or `supabase db pull` deliberately before proceeding.
4. Only then run: `supabase db push`.

### Forbidden moves

- ❌ No schema edits directly in Supabase Studio.
- ❌ No `ALTER TABLE` / `CREATE TABLE` in random SQL tabs without a migration file.
- ❌ No `db push` without first checking `migration list`.

## 1. Principles

1. The **live database** (Supabase project) is the current state of the world.
2. The **migrations in this repo** are the story of how to build that world from scratch.
3. These two must always agree: a brand-new database must be able to replay all migrations
   (and any baseline) without errors and end up identical to prod.

## 2. Rule 1 — No schema changes outside migrations

- If it changes the **schema**, it must be represented in a migration file in
  `supabase/migrations/`.
- Do **not**:
  - Create or alter tables directly in the Supabase UI or SQL editor (except for
    short-lived experiments).
- Do:
  - Convert any UI/SQL experiments into proper migrations before relying on them.
  - Treat migrations as the **single source of truth** for schema evolution.

## 3. Rule 2 — Migrations must be idempotent and fresh-DB-safe

Every migration must be safe to run:

- On an already-migrated DB (no duplicate-column / duplicate-index errors).
- On a **fresh DB** where tables might not exist yet (e.g., `supabase db pull` shadow DB).

### 3.1 Guarding ALTERs and new columns

When altering existing tables or adding columns, always:

- Check that the table exists.
- Check that the column doesn’t already exist.

Example pattern:

```sql
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'my_table'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name  = 'my_table'
        AND column_name = 'new_col'
    ) THEN
      ALTER TABLE public.my_table
        ADD COLUMN new_col text;
    END IF;
  END IF;
END $$;
```

### 3.2 Guarding COMMENTs on legacy tables

When commenting on legacy tables (e.g. `cards`):

```sql
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'cards'
  ) THEN
    COMMENT ON TABLE public.cards IS
      'LEGACY TABLE: superseded by card_prints. Do not build new features on this.';
  END IF;
END $$;
```

### 3.3 Guarding FKs to card_prints (no inline refs in CREATE TABLE)

Do **not** reference `public.card_prints` inline in `CREATE TABLE` in a way that will fail
on a fresh DB.

Instead:

```sql
CREATE TABLE public.external_mappings (
  id            bigserial PRIMARY KEY,
  card_print_id uuid NOT NULL,
  ...
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'card_prints'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.constraint_schema = kcu.constraint_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name = 'external_mappings'
        AND kcu.column_name = 'card_print_id'
    ) THEN
      ALTER TABLE public.external_mappings
        ADD CONSTRAINT external_mappings_card_print_id_fkey
        FOREIGN KEY (card_print_id)
        REFERENCES public.card_prints(id)
        ON DELETE CASCADE;
    END IF;
  END IF;
END $$;
```

## 4. Rule 3 — The replay trifecta (must pass before schema changes are “done”)

Whenever we add or modify migrations, the **minimum** validation sequence is:

1. Apply to the target DB (remote or local):

   ```bash
   supabase db push
   ```

2. Fresh local DB replay:

   ```bash
   supabase db reset
   supabase db push --local
   ```

3. Shadow DB + baseline replay:

   ```bash
   supabase db pull
   ```

All three must succeed with no errors. If any step fails, fix migrations **before**
building additional features on top of that schema.

## 5. Rule 4 — No ad-hoc prod schema edits

* Production schema must be the result of migrations + `supabase db push`, not manual edits.
* In an emergency hotfix:

  * Document the change.
  * Add a corresponding migration as soon as possible.
  * Re-run the replay trifecta to re-align schema and migrations.

## 6. Rule 5 — Card-print rules are sacred

Because `card_prints` is the canonical identity for all prints:

* `card_prints.id` is **uuid** and must remain so.
* Any table that references a print must use `card_print_id uuid` referencing
  `public.card_prints(id)`.
* No new migrations may introduce `bigint` print IDs or break the unique
  `(set_id, number_plain, variant_key)` identity.
* Any migration that touches `card_prints` must be carefully guarded and tested with
  the replay trifecta.

## 7. Syncing ChatGPT + Repo Rules

* ChatGPT is used as a co-architect and holds these rules in its long-term memory.
* This file is the **authoritative** copy inside the repo.
* **Whenever we change a rule in ChatGPT memory, we must also update this document and commit it.**
* If there is ever a disagreement between ChatGPT’s memory and this file, this file wins.

## 8. Why this matters

Following this contract guarantees:

* No more “relation does not exist” surprises in migrations.
* No more drift between remote schema and migrations.
* The ability to spin up fresh environments easily.
* Confidence that schema changes are intentional, reproducible, and safe.
