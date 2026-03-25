begin;

alter table public.vault_item_instances
  add column if not exists pricing_mode text;

alter table public.vault_item_instances
  add column if not exists asking_price_amount numeric null;

alter table public.vault_item_instances
  add column if not exists asking_price_currency text null;

alter table public.vault_item_instances
  add column if not exists asking_price_note text null;

update public.vault_item_instances
set pricing_mode = 'market'
where pricing_mode is null;

alter table public.vault_item_instances
  alter column pricing_mode set default 'market';

alter table public.vault_item_instances
  alter column pricing_mode set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'vault_item_instances_pricing_mode_check'
  ) then
    alter table public.vault_item_instances
      add constraint vault_item_instances_pricing_mode_check
      check (pricing_mode in ('market', 'asking'));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'vault_item_instances_asking_price_amount_nonnegative'
  ) then
    alter table public.vault_item_instances
      add constraint vault_item_instances_asking_price_amount_nonnegative
      check (asking_price_amount is null or asking_price_amount >= 0);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'vault_item_instances_asking_price_currency_check'
  ) then
    alter table public.vault_item_instances
      add constraint vault_item_instances_asking_price_currency_check
      check (
        asking_price_currency is null
        or (
          asking_price_currency = upper(asking_price_currency)
          and char_length(asking_price_currency) = 3
        )
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'vault_item_instances_pricing_mode_state_check'
  ) then
    alter table public.vault_item_instances
      add constraint vault_item_instances_pricing_mode_state_check
      check (
        (
          pricing_mode = 'market'
          and asking_price_amount is null
          and asking_price_currency is null
          and asking_price_note is null
        )
        or (
          pricing_mode = 'asking'
          and asking_price_amount is not null
          and asking_price_currency is not null
        )
      );
  end if;
end
$$;

create index if not exists vault_item_instances_active_pricing_mode_idx
  on public.vault_item_instances (pricing_mode, archived_at)
  where archived_at is null;

commit;
