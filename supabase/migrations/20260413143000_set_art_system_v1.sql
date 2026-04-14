alter table public.sets
  add column if not exists hero_image_url text,
  add column if not exists hero_image_source text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'sets_hero_image_source_allowed_chk'
      and conrelid = 'public.sets'::regclass
  ) then
    alter table public.sets
      add constraint sets_hero_image_source_allowed_chk
      check (
        hero_image_source is null
        or hero_image_source = any (array['tcgdex'::text, 'pokemontcgapi'::text, 'manual'::text])
      );
  end if;
end $$;

comment on column public.sets.hero_image_url is
  'Primary approved set image asset URL for browse and discovery surfaces. Nullable when no approved hero asset exists.';

comment on column public.sets.hero_image_source is
  'Approved source label for hero_image_url. Allowed values: tcgdex, pokemontcgapi, manual.';
