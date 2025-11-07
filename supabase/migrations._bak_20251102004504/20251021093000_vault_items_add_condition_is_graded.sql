-- Normalize vault_items schema: add condition_label and is_graded if missing

alter table if exists public.vault_items
  add column if not exists condition_label text,
  add column if not exists is_graded boolean not null default false;

-- Optional: simple check constraint for known labels (non-strict)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'vault_items_condition_label_chk'
  ) then
    alter table public.vault_items
      add constraint vault_items_condition_label_chk
      check (
        condition_label is null or condition_label in ('NM','LP','MP','HP','DMG')
      );
  end if;
end$$;

