begin;

alter table public.vault_items
  add column if not exists intent text not null default 'hold';

update public.vault_items
set intent = 'hold'
where intent is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'vault_items_intent_check'
      and conrelid = 'public.vault_items'::regclass
  ) then
    alter table public.vault_items
      add constraint vault_items_intent_check
      check (intent in ('trade', 'sell', 'showcase', 'hold'));
  end if;
end
$$;

create index if not exists idx_vault_items_intent_active
on public.vault_items (intent)
where archived_at is null;

create table if not exists public.card_interactions (
  id uuid primary key default gen_random_uuid(),
  card_print_id uuid not null references public.card_prints(id),
  vault_item_id uuid not null references public.vault_items(id),
  sender_user_id uuid not null references auth.users(id) on delete cascade,
  receiver_user_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'card_interactions_status_check'
      and conrelid = 'public.card_interactions'::regclass
  ) then
    alter table public.card_interactions
      add constraint card_interactions_status_check
      check (status in ('open', 'closed'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'card_interactions_sender_receiver_check'
      and conrelid = 'public.card_interactions'::regclass
  ) then
    alter table public.card_interactions
      add constraint card_interactions_sender_receiver_check
      check (sender_user_id <> receiver_user_id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'card_interactions_message_present_check'
      and conrelid = 'public.card_interactions'::regclass
  ) then
    alter table public.card_interactions
      add constraint card_interactions_message_present_check
      check (char_length(btrim(message)) between 1 and 2000);
  end if;
end
$$;

create index if not exists idx_card_interactions_receiver_created
on public.card_interactions (receiver_user_id, created_at desc);

create index if not exists idx_card_interactions_sender_created
on public.card_interactions (sender_user_id, created_at desc);

create index if not exists idx_card_interactions_vault_item_created
on public.card_interactions (vault_item_id, created_at desc);

create index if not exists idx_card_interactions_card_print_created
on public.card_interactions (card_print_id, created_at desc);

create table if not exists public.card_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_print_id uuid not null references public.card_prints(id),
  signal_type text not null,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'card_signals_signal_type_check'
      and conrelid = 'public.card_signals'::regclass
  ) then
    alter table public.card_signals
      add constraint card_signals_signal_type_check
      check (signal_type in ('view', 'click', 'wishlist', 'interaction'));
  end if;
end
$$;

create index if not exists idx_card_signals_user_created
on public.card_signals (user_id, created_at desc);

create index if not exists idx_card_signals_card_print_created
on public.card_signals (card_print_id, created_at desc);

alter table public.card_interactions enable row level security;
alter table public.card_signals enable row level security;

revoke all on table public.card_interactions from anon;
revoke all on table public.card_interactions from authenticated;
revoke all on table public.card_signals from anon;
revoke all on table public.card_signals from authenticated;

grant select, insert, update on table public.card_interactions to authenticated;
grant select, insert on table public.card_signals to authenticated;

drop policy if exists card_interactions_select_participants on public.card_interactions;
create policy card_interactions_select_participants
on public.card_interactions
for select
to authenticated
using (
  auth.uid() = sender_user_id
  or auth.uid() = receiver_user_id
);

drop policy if exists card_interactions_insert_sender on public.card_interactions;
create policy card_interactions_insert_sender
on public.card_interactions
for insert
to authenticated
with check (
  auth.uid() = sender_user_id
  and auth.uid() <> receiver_user_id
  and exists (
    select 1
    from public.vault_items vi
    join public.public_profiles pp
      on pp.user_id = vi.user_id
    where vi.id = card_interactions.vault_item_id
      and vi.user_id = card_interactions.receiver_user_id
      and vi.card_id = card_interactions.card_print_id
      and vi.archived_at is null
      and vi.intent in ('trade', 'sell', 'showcase')
      and pp.public_profile_enabled = true
      and pp.vault_sharing_enabled = true
  )
);

drop policy if exists card_interactions_update_participants on public.card_interactions;
create policy card_interactions_update_participants
on public.card_interactions
for update
to authenticated
using (
  auth.uid() = sender_user_id
  or auth.uid() = receiver_user_id
)
with check (
  auth.uid() = sender_user_id
  or auth.uid() = receiver_user_id
);

drop policy if exists card_signals_select_owner on public.card_signals;
create policy card_signals_select_owner
on public.card_signals
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists card_signals_insert_owner on public.card_signals;
create policy card_signals_insert_owner
on public.card_signals
for insert
to authenticated
with check (auth.uid() = user_id);

drop view if exists public.v_card_stream_v1;

create view public.v_card_stream_v1 as
select
  vi.id as vault_item_id,
  vi.user_id as owner_user_id,
  pp.slug as owner_slug,
  pp.display_name as owner_display_name,
  vi.card_id as card_print_id,
  vi.intent,
  coalesce(vi.qty, 1) as quantity,
  vi.condition_label,
  vi.is_graded,
  vi.grade_company,
  vi.grade_value,
  vi.grade_label,
  vi.created_at,
  cp.gv_id,
  cp.name,
  cp.set_code,
  s.name as set_name,
  cp.number,
  coalesce(vi.photo_url, cp.image_url, cp.image_alt_url) as image_url
from public.vault_items vi
join public.card_prints cp
  on cp.id = vi.card_id
left join public.sets s
  on s.id = cp.set_id
join public.public_profiles pp
  on pp.user_id = vi.user_id
where vi.archived_at is null
  and vi.intent in ('trade', 'sell', 'showcase')
  and pp.public_profile_enabled = true
  and pp.vault_sharing_enabled = true
order by vi.created_at desc, vi.id desc;

grant select on table public.v_card_stream_v1 to anon;
grant select on table public.v_card_stream_v1 to authenticated;

commit;
