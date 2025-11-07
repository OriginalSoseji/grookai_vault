-- Variant columns for stamps/overlays
alter table if exists cards
  add column if not exists variant_tag text default 'NONE',
  add column if not exists has_overlay boolean default false,
  add column if not exists stamp_confidence numeric;

-- Optional: simple check to keep tags uppercase-ish and short
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_name = 'cards' and constraint_name = 'cards_variant_tag_ck'
  ) then
    alter table cards add constraint cards_variant_tag_ck
      check (variant_tag ~ '^[A-Z0-9_]{2,40}$');
  end if;
end$$;

create index if not exists idx_cards_variant_tag on cards (variant_tag);

