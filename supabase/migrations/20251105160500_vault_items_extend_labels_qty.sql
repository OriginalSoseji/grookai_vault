-- Consolidation: promote backup changes to extend vault_items with qty and labels
-- Source refs:
--  - migrations._bak_20251102004504/20251020180000_add_qty_and_views.sql (qty)
--  - migrations._bak_20251102004504/20250912022227_gv_step1_extend_vault_items.sql (condition_label, grade_label)
-- Additive and idempotent: uses IF NOT EXISTS and avoids drops/renames.

-- qty column
alter table public.vault_items
  add column if not exists qty integer not null default 1;

-- labels used by the Flutter app
alter table public.vault_items
  add column if not exists condition_label text;

alter table public.vault_items
  add column if not exists grade_label text;

