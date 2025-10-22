# DB Migration Notes — Clean Sync + Resilient Views

Summary of changes applied in this branch/tag:

- Resilient views and guards to support shadow DB/diff
  - `003` now creates `public.v_vault_items` and `public.v_recently_added` defensively.
  - `004` creates `public.v_best_prices_all` iff `public.prices` exists; uses typed numeric casts to prevent type-change errors.
  - `latest_prices` drops and unique index creation are guarded; BOM issues fixed in older SQL.
  - Minimal `public.card_prints` bootstrap added so `price_observations` FK compiles in a fresh shadow DB.

- Function alignment (vault add)
  - `public.vault_add_item` now has a single, correct signature:
    - `(p_user_id uuid, p_card_id uuid, p_condition_label text)`
    - Inserts into `public.vault_items(user_id, card_id, condition_label)`.

- Repo hygiene
  - `.editorconfig` enforces UTF-8 + LF for `.sql` (prevents BOM-related errors).
  - `.gitattributes` routes large/binary assets to Git LFS.
  - A generated diff migration was archived to avoid duplicate DDL on push.

## Validate on Remote (non-destructive)

Use psql or Supabase SQL editor to run a quick transaction that calls the function and rolls back:

```sql
begin;
select public.vault_add_item(
  '00000000-0000-0000-0000-000000000000'::uuid,  -- p_user_id (any UUID)
  '00000000-0000-0000-0000-000000000000'::uuid,  -- p_card_id (any UUID)
  'NM'                                           -- p_condition_label
) as new_id;
rollback; -- ensures no persistent data is written
```

Rerun lint to confirm:

```
supabase db lint --db-url "postgres://postgres:<pwd>@db.<ref>.supabase.co:5432/postgres?sslmode=require"
```

## Notes for the Team

- If you pulled history before the LFS migration, run:
  - `git fetch --all`
  - `git reset --hard origin/feature/price-importer`
  - `git lfs install`

- For future DB work:
  - Prefer idempotent `CREATE ... IF NOT EXISTS`, and guard view creation with `DO $$ IF EXISTS(...) THEN ... ELSE ... END $$;` where dependencies may be missing in a fresh shadow DB.
  - Keep file encoding as UTF‑8 (no BOM).

