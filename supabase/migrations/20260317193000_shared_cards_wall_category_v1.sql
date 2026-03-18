begin;

alter table public.shared_cards
  add column if not exists wall_category text null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'shared_cards_wall_category_check'
  ) then
    alter table public.shared_cards
      add constraint shared_cards_wall_category_check
      check (
        wall_category is null
        or wall_category in (
          'grails',
          'favorites',
          'for_sale',
          'personal_collection',
          'trades',
          'promos',
          'psa',
          'cgc',
          'bgs',
          'other'
        )
      );
  end if;
end $$;

create index if not exists shared_cards_wall_category_idx
on public.shared_cards (wall_category);

commit;
