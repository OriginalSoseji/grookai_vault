# Migrations Baseline (Grookai Vault)

**Why**  
We aligned remote history using repair (remote) + stubs historically, and quarantined the `20251103` wall migrations until prerequisites (e.g., `public.listings`) exist.

**What was quarantined**  
Moved to `_archive_local/` and suffixed `.bak`:
- `20251103_wall_feed_view.sql`
- `20251103_wall_posting_mvp.sql`
- `20251103_wall_thumbs_3x4.sql`

**Re-introducing wall migrations later**  
Split base tables first, then derived objects:
1. New dated migration for base tables (e.g., `public.listings`).
2. Separate new dated migration(s) for views/materialized views/functions.
> Do **not** reuse `20251103` IDs. Always create new, dated migrations.

**Command cheatsheet (reference)**  
- `supabase migration repair --status reverted <ids...>`
- `supabase db pull`
- `supabase db push`
- `supabase db diff --use-mig-dir supabase/migrations --schema public`
