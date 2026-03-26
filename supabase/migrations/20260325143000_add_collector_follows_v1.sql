begin;

create table if not exists public.collector_follows (
  id uuid primary key default gen_random_uuid(),
  follower_user_id uuid not null references auth.users(id) on delete cascade,
  followed_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint collector_follows_no_self_follow_check check (follower_user_id <> followed_user_id),
  constraint collector_follows_unique_pair unique (follower_user_id, followed_user_id)
);

create index if not exists idx_collector_follows_follower_created
on public.collector_follows (follower_user_id, created_at desc);

create index if not exists idx_collector_follows_followed_created
on public.collector_follows (followed_user_id, created_at desc);

alter table public.collector_follows enable row level security;

revoke all on table public.collector_follows from anon;
revoke all on table public.collector_follows from authenticated;

grant select, insert, delete on table public.collector_follows to authenticated;

drop policy if exists collector_follows_select_owner on public.collector_follows;
create policy collector_follows_select_owner
on public.collector_follows
for select
to authenticated
using (auth.uid() = follower_user_id);

drop policy if exists collector_follows_insert_owner on public.collector_follows;
create policy collector_follows_insert_owner
on public.collector_follows
for insert
to authenticated
with check (auth.uid() = follower_user_id);

drop policy if exists collector_follows_delete_owner on public.collector_follows;
create policy collector_follows_delete_owner
on public.collector_follows
for delete
to authenticated
using (auth.uid() = follower_user_id);

commit;
