begin;

create table if not exists public.user_card_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_print_id uuid not null references public.card_prints(id) on delete cascade,
  want boolean not null default false,
  trade boolean not null default false,
  sell boolean not null default false,
  showcase boolean not null default false,
  is_public boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_card_intents_unique unique (user_id, card_print_id),
  constraint user_card_intents_metadata_object_check check (jsonb_typeof(metadata) = 'object')
);

comment on table public.user_card_intents is
'Durable collector intent per canonical card. One row per user and card_print_id; supports future want, trade, sell, and showcase surfaces.';

create index if not exists idx_user_card_intents_user
on public.user_card_intents (user_id);

create index if not exists idx_user_card_intents_card
on public.user_card_intents (card_print_id);

create index if not exists idx_user_card_intents_public_want
on public.user_card_intents (card_print_id)
where want = true and is_public = true;

drop trigger if exists trg_user_card_intents_updated_at on public.user_card_intents;
create trigger trg_user_card_intents_updated_at
before update on public.user_card_intents
for each row execute function public.set_timestamp_updated_at();

create table if not exists public.card_feed_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_print_id uuid not null references public.card_prints(id) on delete cascade,
  event_type text not null,
  surface text,
  source_bucket text,
  feed_request_id uuid,
  position integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint card_feed_events_event_type_check check (
    event_type = any (
      array[
        'impression'::text,
        'click'::text,
        'open_detail'::text,
        'share'::text,
        'want_on'::text,
        'want_off'::text,
        'add_to_vault'::text,
        'hide'::text,
        'dismiss'::text
      ]
    )
  ),
  constraint card_feed_events_position_nonnegative_check check (position is null or position >= 0),
  constraint card_feed_events_metadata_object_check check (jsonb_typeof(metadata) = 'object')
);

comment on table public.card_feed_events is
'Append-only card feed memory and ranking signal lane. Tracks impressions and explicit user actions for anti-repeat and future AI ranking.';

create index if not exists idx_feed_events_user_time
on public.card_feed_events (user_id, created_at desc);

create index if not exists idx_feed_events_user_card
on public.card_feed_events (user_id, card_print_id, created_at desc);

create index if not exists idx_feed_events_type
on public.card_feed_events (user_id, event_type, created_at desc);

create or replace function public.card_feed_events_block_mutation_v1()
returns trigger
language plpgsql
as $$
begin
  raise exception 'card_feed_events is append-only';
end;
$$;

create or replace function public.card_feed_events_set_insert_defaults_v1()
returns trigger
language plpgsql
as $$
begin
  new.user_id := coalesce(new.user_id, auth.uid());
  new.metadata := coalesce(new.metadata, '{}'::jsonb);
  new.created_at := coalesce(new.created_at, now());
  return new;
end;
$$;

drop trigger if exists trg_card_feed_events_block_update on public.card_feed_events;
create trigger trg_card_feed_events_block_update
before update on public.card_feed_events
for each row execute function public.card_feed_events_block_mutation_v1();

drop trigger if exists trg_card_feed_events_block_delete on public.card_feed_events;
create trigger trg_card_feed_events_block_delete
before delete on public.card_feed_events
for each row execute function public.card_feed_events_block_mutation_v1();

drop trigger if exists trg_card_feed_events_set_insert_defaults on public.card_feed_events;
create trigger trg_card_feed_events_set_insert_defaults
before insert on public.card_feed_events
for each row execute function public.card_feed_events_set_insert_defaults_v1();

create table if not exists public.card_comments (
  id uuid primary key default gen_random_uuid(),
  card_print_id uuid not null references public.card_prints(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  intent_type text,
  parent_comment_id uuid references public.card_comments(id) on delete restrict,
  is_public boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint card_comments_body_present_check check (char_length(btrim(body)) between 1 and 2000),
  constraint card_comments_intent_type_check check (
    intent_type is null
    or intent_type = any (array['want'::text, 'trade'::text, 'sell'::text, 'showcase'::text])
  ),
  constraint card_comments_metadata_object_check check (jsonb_typeof(metadata) = 'object'),
  constraint card_comments_not_self_parent check (parent_comment_id is null or parent_comment_id <> id)
);

comment on table public.card_comments is
'Card-anchored public interaction layer. Comments must stay attached to a canonical card_print_id and may optionally reply to another comment on the same card.';

create index if not exists idx_card_comments_card
on public.card_comments (card_print_id, created_at desc);

create index if not exists idx_card_comments_user
on public.card_comments (user_id);

drop trigger if exists trg_card_comments_updated_at on public.card_comments;
create trigger trg_card_comments_updated_at
before update on public.card_comments
for each row execute function public.set_timestamp_updated_at();

create or replace function public.card_comments_set_insert_defaults_v1()
returns trigger
language plpgsql
as $$
begin
  new.user_id := coalesce(new.user_id, auth.uid());
  new.metadata := coalesce(new.metadata, '{}'::jsonb);
  new.created_at := coalesce(new.created_at, now());
  new.updated_at := coalesce(new.updated_at, new.created_at);
  return new;
end;
$$;

create or replace function public.card_comments_validate_parent_v1()
returns trigger
language plpgsql
as $$
declare
  v_parent_card_print_id uuid;
begin
  if new.parent_comment_id is null then
    return new;
  end if;

  select cc.card_print_id
    into v_parent_card_print_id
  from public.card_comments cc
  where cc.id = new.parent_comment_id;

  if v_parent_card_print_id is null then
    raise exception 'parent comment not found' using errcode = '23503';
  end if;

  if v_parent_card_print_id <> new.card_print_id then
    raise exception 'parent comment must reference the same card_print_id' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_card_comments_set_insert_defaults on public.card_comments;
create trigger trg_card_comments_set_insert_defaults
before insert on public.card_comments
for each row execute function public.card_comments_set_insert_defaults_v1();

drop trigger if exists trg_card_comments_validate_parent on public.card_comments;
create trigger trg_card_comments_validate_parent
before insert or update of parent_comment_id, card_print_id on public.card_comments
for each row execute function public.card_comments_validate_parent_v1();

alter table public.user_card_intents enable row level security;
alter table public.card_feed_events enable row level security;
alter table public.card_comments enable row level security;

revoke all on table public.user_card_intents from public, anon, authenticated;
revoke all on table public.card_feed_events from public, anon, authenticated;
revoke all on table public.card_comments from public, anon, authenticated;

grant select on table public.user_card_intents to anon, authenticated;
grant insert, update, delete on table public.user_card_intents to authenticated;

grant select, insert on table public.card_feed_events to authenticated;

grant select on table public.card_comments to anon, authenticated;
grant insert, update, delete on table public.card_comments to authenticated;

drop policy if exists user_card_intents_public_read on public.user_card_intents;
create policy user_card_intents_public_read
on public.user_card_intents
for select
to anon, authenticated
using (is_public = true);

drop policy if exists user_card_intents_owner_select on public.user_card_intents;
create policy user_card_intents_owner_select
on public.user_card_intents
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists user_card_intents_owner_insert on public.user_card_intents;
create policy user_card_intents_owner_insert
on public.user_card_intents
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists user_card_intents_owner_update on public.user_card_intents;
create policy user_card_intents_owner_update
on public.user_card_intents
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists user_card_intents_owner_delete on public.user_card_intents;
create policy user_card_intents_owner_delete
on public.user_card_intents
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists user_card_intents_service_role_all on public.user_card_intents;
create policy user_card_intents_service_role_all
on public.user_card_intents
for all
to service_role
using (true)
with check (true);

drop policy if exists card_feed_events_owner_select on public.card_feed_events;
create policy card_feed_events_owner_select
on public.card_feed_events
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists card_feed_events_owner_insert on public.card_feed_events;
create policy card_feed_events_owner_insert
on public.card_feed_events
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists card_feed_events_service_role_all on public.card_feed_events;
create policy card_feed_events_service_role_all
on public.card_feed_events
for all
to service_role
using (true)
with check (true);

drop policy if exists card_comments_public_read on public.card_comments;
create policy card_comments_public_read
on public.card_comments
for select
to anon, authenticated
using (is_public = true);

drop policy if exists card_comments_owner_select on public.card_comments;
create policy card_comments_owner_select
on public.card_comments
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists card_comments_owner_insert on public.card_comments;
create policy card_comments_owner_insert
on public.card_comments
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists card_comments_owner_update on public.card_comments;
create policy card_comments_owner_update
on public.card_comments
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists card_comments_owner_delete on public.card_comments;
create policy card_comments_owner_delete
on public.card_comments
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists card_comments_service_role_all on public.card_comments;
create policy card_comments_service_role_all
on public.card_comments
for all
to service_role
using (true)
with check (true);

commit;
