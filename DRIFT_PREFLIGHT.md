# Drift Preflight Checklist
Quick checklist to avoid view drift, replay failures, out-of-sync migrations, and future-shape pricing assumptions.

## When to Use This
- Modifying or creating a Postgres view.
- Adding pricing-related fields.
- Changing anything in `v_best_prices_all`.
- Touching `v_vault_items`, `v_vault_items_ext`, or `v_recently_added`.
- Introducing new columns that will appear in dependent views.

## Core Questions
- Is this a core view? (`v_best_prices_all`, `v_vault_items`, `v_vault_items_ext`, `v_recently_added`)
- Are you referencing only columns that already exist?
- Does the view depend on pricing fields that actually exist in `v_best_prices_all` today?
- Are any applied migrations being edited? (must always be NO)
- Does this change belong in a new repair migration?
- Is this a multi-step change (schema → pricing view → dependent views)?

## Required Checks
- Check `docs/VIEW_EVOLUTION_V1.md` (core rules).
- Check `docs/PRICING_VIEW_SHAPE_V1.md` (pricing view rules).
- Verify new fields exist in base tables before using in views.
- For core views, plan to use DROP+CREATE, not CREATE OR REPLACE.
- Plan migration order so replay works on a fresh DB.
- Confirm dependent views (`_ext`, `v_recently_added`) will be dropped and recreated if needed.
- Confirm no speculative columns are referenced.

## Required Documents
- `docs/VIEW_EVOLUTION_V1.md`
- `docs/PRICING_VIEW_SHAPE_V1.md`
- `docs/DRIFT_INCIDENT_2025-12-06.md`

Review these before writing any view or pricing migration.

## Safe Migration Patterns
- **Pattern A — Small view change (non-core)**
  - New migration file.
  - `CREATE OR REPLACE VIEW ...`
  - Only if column order/names stay identical.
  - Only if no dependents and no future-shape columns are used.
- **Pattern B — Core view evolution**
  - New repair migration.
  - `DROP VIEW IF EXISTS` on dependents.
  - `DROP VIEW IF EXISTS` on the target view.
  - `CREATE VIEW` definitions in canonical order.
  - Matches rules in `VIEW_EVOLUTION_V1.md`.
  - Example: `20251206140000_vault_views_back_fields_fix_v1.sql`.

## Final Gate
- Can the migrations replay cleanly from scratch? (`supabase db reset --local`)
- Does `supabase db push` run with no errors?
- Does `.\scripts\drift_guard.ps1` return exit code 0?
- Does the new view shape match the canonical contracts?
- Are future features NOT referenced prematurely?

If all are YES, migrations may proceed.
