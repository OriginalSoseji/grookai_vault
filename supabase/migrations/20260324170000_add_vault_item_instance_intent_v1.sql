begin;

alter table public.vault_item_instances
  add column if not exists intent text not null default 'hold';

update public.vault_item_instances as vii
set intent = coalesce(vi.intent, 'hold')
from public.vault_items as vi
where vii.archived_at is null
  and vii.legacy_vault_item_id = vi.id
  and vi.archived_at is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'vault_item_instances_intent_check'
  ) then
    alter table public.vault_item_instances
      add constraint vault_item_instances_intent_check
      check (intent in ('hold', 'trade', 'sell', 'showcase'));
  end if;
end
$$;

create index if not exists idx_vault_item_instances_anchor_archived_at
  on public.vault_item_instances (legacy_vault_item_id, archived_at);

create index if not exists idx_vault_item_instances_card_archived_at
  on public.vault_item_instances (card_print_id, archived_at);

create index if not exists idx_vault_item_instances_intent_archived_at
  on public.vault_item_instances (intent, archived_at);

create index if not exists idx_vault_item_instances_active_user_card_created
  on public.vault_item_instances (user_id, card_print_id, created_at desc)
  where archived_at is null;

commit;
