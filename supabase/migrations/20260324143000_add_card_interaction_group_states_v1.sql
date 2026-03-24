create table if not exists public.card_interaction_group_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  card_print_id uuid not null,
  counterpart_user_id uuid not null,
  has_unread boolean not null default false,
  last_read_at timestamptz null,
  latest_message_at timestamptz not null default now(),
  archived_at timestamptz null,
  closed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint card_interaction_group_states_user_counterpart_check check (user_id <> counterpart_user_id),
  constraint card_interaction_group_states_user_card_counterpart_key unique (user_id, card_print_id, counterpart_user_id)
);

create index if not exists idx_card_interaction_group_states_user_latest
on public.card_interaction_group_states (user_id, latest_message_at desc);

create index if not exists idx_card_interaction_group_states_user_unread_active
on public.card_interaction_group_states (user_id, latest_message_at desc)
where has_unread is true
  and archived_at is null
  and closed_at is null;

create index if not exists idx_card_interaction_group_states_user_closed_or_archived
on public.card_interaction_group_states (user_id, latest_message_at desc)
where archived_at is not null
   or closed_at is not null;

alter table public.card_interaction_group_states enable row level security;

revoke all on table public.card_interaction_group_states from anon;
revoke all on table public.card_interaction_group_states from authenticated;

grant select, insert, update on table public.card_interaction_group_states to authenticated;

drop policy if exists card_interaction_group_states_select_owner on public.card_interaction_group_states;
create policy card_interaction_group_states_select_owner
on public.card_interaction_group_states
for select
using (auth.uid() = user_id);

drop policy if exists card_interaction_group_states_insert_owner on public.card_interaction_group_states;
create policy card_interaction_group_states_insert_owner
on public.card_interaction_group_states
for insert
with check (auth.uid() = user_id);

drop policy if exists card_interaction_group_states_update_owner on public.card_interaction_group_states;
create policy card_interaction_group_states_update_owner
on public.card_interaction_group_states
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.sync_card_interaction_group_states_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.card_interaction_group_states as group_states (
    user_id,
    card_print_id,
    counterpart_user_id,
    has_unread,
    last_read_at,
    latest_message_at,
    archived_at,
    closed_at,
    created_at,
    updated_at
  )
  values (
    new.sender_user_id,
    new.card_print_id,
    new.receiver_user_id,
    false,
    new.created_at,
    new.created_at,
    null,
    null,
    new.created_at,
    new.created_at
  )
  on conflict (user_id, card_print_id, counterpart_user_id)
  do update set
    has_unread = false,
    last_read_at = greatest(coalesce(group_states.last_read_at, '-infinity'::timestamptz), excluded.latest_message_at),
    latest_message_at = excluded.latest_message_at,
    archived_at = null,
    closed_at = null,
    updated_at = excluded.updated_at;

  insert into public.card_interaction_group_states as group_states (
    user_id,
    card_print_id,
    counterpart_user_id,
    has_unread,
    last_read_at,
    latest_message_at,
    archived_at,
    closed_at,
    created_at,
    updated_at
  )
  values (
    new.receiver_user_id,
    new.card_print_id,
    new.sender_user_id,
    true,
    null,
    new.created_at,
    null,
    null,
    new.created_at,
    new.created_at
  )
  on conflict (user_id, card_print_id, counterpart_user_id)
  do update set
    has_unread = true,
    latest_message_at = excluded.latest_message_at,
    archived_at = null,
    closed_at = null,
    updated_at = excluded.updated_at;

  return new;
end;
$$;

drop trigger if exists trg_sync_card_interaction_group_states_v1 on public.card_interactions;
create trigger trg_sync_card_interaction_group_states_v1
after insert on public.card_interactions
for each row
execute function public.sync_card_interaction_group_states_v1();

with participant_rows as (
  select
    sender_user_id as user_id,
    card_print_id,
    receiver_user_id as counterpart_user_id,
    created_at,
    false as has_unread
  from public.card_interactions
  union all
  select
    receiver_user_id as user_id,
    card_print_id,
    sender_user_id as counterpart_user_id,
    created_at,
    true as has_unread
  from public.card_interactions
),
latest_rows as (
  select distinct on (user_id, card_print_id, counterpart_user_id)
    user_id,
    card_print_id,
    counterpart_user_id,
    has_unread,
    created_at as latest_message_at
  from participant_rows
  order by user_id, card_print_id, counterpart_user_id, created_at desc
)
insert into public.card_interaction_group_states (
  user_id,
  card_print_id,
  counterpart_user_id,
  has_unread,
  last_read_at,
  latest_message_at,
  archived_at,
  closed_at,
  created_at,
  updated_at
)
select
  user_id,
  card_print_id,
  counterpart_user_id,
  has_unread,
  case when has_unread then null else latest_message_at end,
  latest_message_at,
  null,
  null,
  latest_message_at,
  latest_message_at
from latest_rows
on conflict (user_id, card_print_id, counterpart_user_id) do nothing;
