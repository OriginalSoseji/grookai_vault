begin;

alter table public.shared_cards
  add column if not exists price_display_mode text null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'shared_cards_price_display_mode_check'
  ) then
    alter table public.shared_cards
      add constraint shared_cards_price_display_mode_check
      check (
        price_display_mode is null
        or price_display_mode in ('grookai', 'my_price', 'hidden')
      );
  end if;
end;
$$;

commit;
