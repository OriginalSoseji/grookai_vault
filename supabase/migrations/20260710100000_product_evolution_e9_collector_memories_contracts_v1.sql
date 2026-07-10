begin;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'collector_memory_type'
  ) then
    create type public.collector_memory_type as enum (
      'added_place',
      'occasion',
      'first',
      'note'
    );
  end if;
end;
$$;

comment on type public.collector_memory_type is
'E9 private collector memory kinds. Memories are owner-only exact-copy annotations and never feed/public events.';

create table if not exists public.collector_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vault_item_instance_id uuid not null references public.vault_item_instances(id) on delete cascade,
  memory_type public.collector_memory_type not null,
  note text null,
  photo_path text null,
  place_label text null,
  occasion_label text null,
  memory_date date null,
  prompt_key text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz null,
  constraint collector_memories_note_length_check
    check (note is null or char_length(note) <= 1200),
  constraint collector_memories_place_label_length_check
    check (place_label is null or char_length(place_label) <= 80),
  constraint collector_memories_occasion_label_length_check
    check (occasion_label is null or char_length(occasion_label) <= 80),
  constraint collector_memories_prompt_key_normalized_check
    check (prompt_key is null or btrim(prompt_key) <> ''),
  constraint collector_memories_photo_path_owner_shape_check
    check (
      photo_path is null
      or photo_path = (
        user_id::text || '/memories/' || id::text || '/photo'
      )
    )
);

comment on table public.collector_memories is
'E9 private exact-copy memories. Owner-only, GVVI-anchored, no public read path, no card_events emission.';

create index if not exists collector_memories_user_instance_created_idx
  on public.collector_memories (user_id, vault_item_instance_id, created_at desc, id desc)
  where archived_at is null;

create index if not exists collector_memories_user_memory_date_idx
  on public.collector_memories (user_id, memory_date desc nulls last, created_at desc, id desc)
  where archived_at is null;

create unique index if not exists collector_memories_user_prompt_active_unique_idx
  on public.collector_memories (user_id, prompt_key)
  where prompt_key is not null and archived_at is null;

create table if not exists public.collector_memory_prompt_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vault_item_instance_id uuid not null references public.vault_item_instances(id) on delete cascade,
  prompt_key text not null,
  prompt_type public.collector_memory_type not null,
  prompt_payload jsonb not null default '{}'::jsonb,
  offered_at timestamptz not null default now(),
  accepted_memory_id uuid null references public.collector_memories(id) on delete set null,
  dismissed_at timestamptz null,
  dismissed_forever boolean not null default false,
  constraint collector_memory_prompt_state_prompt_key_nonempty_check
    check (btrim(prompt_key) <> ''),
  constraint collector_memory_prompt_state_prompt_type_check
    check (prompt_type in ('first'::public.collector_memory_type, 'added_place'::public.collector_memory_type)),
  constraint collector_memory_prompt_state_payload_object_check
    check (jsonb_typeof(prompt_payload) = 'object')
);

comment on table public.collector_memory_prompt_state is
'E9 owner-only state for quiet collector-memory prompts. Prompts never auto-create memories and never emit public events.';

create unique index if not exists collector_memory_prompt_state_user_key_unique_idx
  on public.collector_memory_prompt_state (user_id, prompt_key);

create index if not exists collector_memory_prompt_state_user_instance_idx
  on public.collector_memory_prompt_state (user_id, vault_item_instance_id, offered_at desc);

create or replace function public.collector_memory_touch_updated_at_v1()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_collector_memories_updated_at on public.collector_memories;
create trigger trg_collector_memories_updated_at
before update on public.collector_memories
for each row
execute function public.collector_memory_touch_updated_at_v1();

create or replace function public.collector_memory_assert_owned_instance_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.vault_item_instances vii
    where vii.id = new.vault_item_instance_id
      and vii.user_id = new.user_id
      and vii.archived_at is null
  ) then
    raise exception 'collector memory must target an active owned vault item instance';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_collector_memories_owned_instance on public.collector_memories;
create trigger trg_collector_memories_owned_instance
before insert or update of user_id, vault_item_instance_id
on public.collector_memories
for each row
execute function public.collector_memory_assert_owned_instance_v1();

drop trigger if exists trg_collector_memory_prompt_state_owned_instance on public.collector_memory_prompt_state;
create trigger trg_collector_memory_prompt_state_owned_instance
before insert or update of user_id, vault_item_instance_id
on public.collector_memory_prompt_state
for each row
execute function public.collector_memory_assert_owned_instance_v1();

alter table public.collector_memories enable row level security;
alter table public.collector_memory_prompt_state enable row level security;

revoke all on public.collector_memories from public, anon, authenticated;
revoke all on public.collector_memory_prompt_state from public, anon, authenticated;

grant select, insert, update, delete on public.collector_memories to authenticated;
grant select, insert, update, delete on public.collector_memory_prompt_state to authenticated;
grant all on public.collector_memories to service_role;
grant all on public.collector_memory_prompt_state to service_role;

drop policy if exists collector_memories_owner_select on public.collector_memories;
create policy collector_memories_owner_select
on public.collector_memories
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists collector_memories_owner_insert on public.collector_memories;
create policy collector_memories_owner_insert
on public.collector_memories
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists collector_memories_owner_update on public.collector_memories;
create policy collector_memories_owner_update
on public.collector_memories
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists collector_memories_owner_delete on public.collector_memories;
create policy collector_memories_owner_delete
on public.collector_memories
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists collector_memory_prompt_state_owner_select on public.collector_memory_prompt_state;
create policy collector_memory_prompt_state_owner_select
on public.collector_memory_prompt_state
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists collector_memory_prompt_state_owner_insert on public.collector_memory_prompt_state;
create policy collector_memory_prompt_state_owner_insert
on public.collector_memory_prompt_state
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists collector_memory_prompt_state_owner_update on public.collector_memory_prompt_state;
create policy collector_memory_prompt_state_owner_update
on public.collector_memory_prompt_state
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists collector_memory_prompt_state_owner_delete on public.collector_memory_prompt_state;
create policy collector_memory_prompt_state_owner_delete
on public.collector_memory_prompt_state
for delete
to authenticated
using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'collector-memory-images',
  'collector-memory-images',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists collector_memory_images_owner_select_v1 on storage.objects;
create policy collector_memory_images_owner_select_v1
on storage.objects
for select
to authenticated
using (
  bucket_id = 'collector-memory-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists collector_memory_images_owner_insert_v1 on storage.objects;
create policy collector_memory_images_owner_insert_v1
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'collector-memory-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists collector_memory_images_owner_update_v1 on storage.objects;
create policy collector_memory_images_owner_update_v1
on storage.objects
for update
to authenticated
using (
  bucket_id = 'collector-memory-images'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'collector-memory-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists collector_memory_images_owner_delete_v1 on storage.objects;
create policy collector_memory_images_owner_delete_v1
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'collector-memory-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create or replace function public.collector_memories_for_gvvi_v1(
  p_gv_vi_id text,
  p_limit integer default 20,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null
)
returns table (
  id uuid,
  vault_item_instance_id uuid,
  gv_vi_id text,
  memory_type public.collector_memory_type,
  note text,
  photo_path text,
  place_label text,
  occasion_label text,
  memory_date date,
  prompt_key text,
  created_at timestamptz,
  updated_at timestamptz,
  cursor_created_at timestamptz,
  cursor_id uuid
)
language sql
security definer
set search_path = public
as $$
  with viewer as (
    select auth.uid() as user_id
  ), target as (
    select vii.id, vii.gv_vi_id
    from public.vault_item_instances vii, viewer
    where viewer.user_id is not null
      and vii.user_id = viewer.user_id
      and vii.archived_at is null
      and vii.gv_vi_id = upper(btrim(coalesce(p_gv_vi_id, '')))
    limit 1
  )
  select
    cm.id,
    cm.vault_item_instance_id,
    target.gv_vi_id,
    cm.memory_type,
    cm.note,
    cm.photo_path,
    cm.place_label,
    cm.occasion_label,
    cm.memory_date,
    cm.prompt_key,
    cm.created_at,
    cm.updated_at,
    cm.created_at as cursor_created_at,
    cm.id as cursor_id
  from public.collector_memories cm
  join target on target.id = cm.vault_item_instance_id
  where cm.user_id = auth.uid()
    and cm.archived_at is null
    and (
      p_before_created_at is null
      or (cm.created_at, cm.id) < (p_before_created_at, coalesce(p_before_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid))
    )
  order by cm.created_at desc, cm.id desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

create or replace function public.collector_memory_create_v1(
  p_gv_vi_id text,
  p_memory_type public.collector_memory_type,
  p_note text default null,
  p_photo_path text default null,
  p_place_label text default null,
  p_occasion_label text default null,
  p_memory_date date default null,
  p_prompt_key text default null
)
returns public.collector_memories
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_instance public.vault_item_instances%rowtype;
  v_memory_id uuid := gen_random_uuid();
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_place_label text := nullif(btrim(coalesce(p_place_label, '')), '');
  v_occasion_label text := nullif(btrim(coalesce(p_occasion_label, '')), '');
  v_prompt_key text := nullif(btrim(coalesce(p_prompt_key, '')), '');
  v_photo_path text := nullif(btrim(coalesce(p_photo_path, '')), '');
  v_row public.collector_memories%rowtype;
begin
  if v_user_id is null then
    raise exception 'sign in required';
  end if;

  select *
  into v_instance
  from public.vault_item_instances
  where user_id = v_user_id
    and archived_at is null
    and gv_vi_id = upper(btrim(coalesce(p_gv_vi_id, '')))
  limit 1;

  if v_instance.id is null then
    raise exception 'collector memory target not found';
  end if;

  if v_note is not null and char_length(v_note) > 1200 then
    raise exception 'collector memory note is too long';
  end if;

  if v_place_label is not null and char_length(v_place_label) > 80 then
    raise exception 'collector memory place label is too long';
  end if;

  if v_occasion_label is not null and char_length(v_occasion_label) > 80 then
    raise exception 'collector memory occasion label is too long';
  end if;

  if v_photo_path is not null and v_photo_path <> (v_user_id::text || '/memories/' || v_memory_id::text || '/photo') then
    raise exception 'collector memory photo path is invalid';
  end if;

  insert into public.collector_memories (
    id,
    user_id,
    vault_item_instance_id,
    memory_type,
    note,
    photo_path,
    place_label,
    occasion_label,
    memory_date,
    prompt_key
  )
  values (
    v_memory_id,
    v_user_id,
    v_instance.id,
    p_memory_type,
    v_note,
    v_photo_path,
    v_place_label,
    v_occasion_label,
    p_memory_date,
    v_prompt_key
  )
  returning * into v_row;

  if v_prompt_key is not null then
    insert into public.collector_memory_prompt_state (
      user_id,
      vault_item_instance_id,
      prompt_key,
      prompt_type,
      accepted_memory_id
    )
    values (
      v_user_id,
      v_instance.id,
      v_prompt_key,
      case
        when p_memory_type = 'added_place'::public.collector_memory_type then 'added_place'::public.collector_memory_type
        else 'first'::public.collector_memory_type
      end,
      v_row.id
    )
    on conflict (user_id, prompt_key) do update
    set
      accepted_memory_id = excluded.accepted_memory_id,
      dismissed_at = null,
      dismissed_forever = false
    where public.collector_memory_prompt_state.user_id = v_user_id;
  end if;

  return v_row;
end;
$$;

create or replace function public.collector_memory_update_v1(
  p_memory_id uuid,
  p_note text default null,
  p_photo_path text default null,
  p_place_label text default null,
  p_occasion_label text default null,
  p_memory_date date default null
)
returns public.collector_memories
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing public.collector_memories%rowtype;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_photo_path text := nullif(btrim(coalesce(p_photo_path, '')), '');
  v_place_label text := nullif(btrim(coalesce(p_place_label, '')), '');
  v_occasion_label text := nullif(btrim(coalesce(p_occasion_label, '')), '');
  v_row public.collector_memories%rowtype;
begin
  if v_user_id is null then
    raise exception 'sign in required';
  end if;

  select *
  into v_existing
  from public.collector_memories
  where id = p_memory_id
    and user_id = v_user_id
    and archived_at is null
  limit 1;

  if v_existing.id is null then
    raise exception 'collector memory not found';
  end if;

  if v_note is not null and char_length(v_note) > 1200 then
    raise exception 'collector memory note is too long';
  end if;

  if v_place_label is not null and char_length(v_place_label) > 80 then
    raise exception 'collector memory place label is too long';
  end if;

  if v_occasion_label is not null and char_length(v_occasion_label) > 80 then
    raise exception 'collector memory occasion label is too long';
  end if;

  if v_photo_path is not null and v_photo_path <> (v_user_id::text || '/memories/' || p_memory_id::text || '/photo') then
    raise exception 'collector memory photo path is invalid';
  end if;

  update public.collector_memories
  set
    note = v_note,
    photo_path = v_photo_path,
    place_label = v_place_label,
    occasion_label = v_occasion_label,
    memory_date = p_memory_date
  where id = p_memory_id
    and user_id = v_user_id
    and archived_at is null
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.collector_memory_archive_v1(p_memory_id uuid)
returns public.collector_memories
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.collector_memories%rowtype;
begin
  if v_user_id is null then
    raise exception 'sign in required';
  end if;

  update public.collector_memories
  set archived_at = coalesce(archived_at, now())
  where id = p_memory_id
    and user_id = v_user_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'collector memory not found';
  end if;

  return v_row;
end;
$$;

create or replace function public.collector_memory_prompt_state_v1(p_gv_vi_id text)
returns table (
  prompt_key text,
  prompt_type public.collector_memory_type,
  prompt_payload jsonb,
  offered_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  with target as (
    select vii.id
    from public.vault_item_instances vii
    where auth.uid() is not null
      and vii.user_id = auth.uid()
      and vii.archived_at is null
      and vii.gv_vi_id = upper(btrim(coalesce(p_gv_vi_id, '')))
    limit 1
  )
  select
    ps.prompt_key,
    ps.prompt_type,
    ps.prompt_payload,
    ps.offered_at
  from public.collector_memory_prompt_state ps
  join target on target.id = ps.vault_item_instance_id
  where ps.user_id = auth.uid()
    and ps.accepted_memory_id is null
    and coalesce(ps.dismissed_forever, false) = false
  order by ps.offered_at desc, ps.id desc;
$$;

create or replace function public.collector_memory_prompt_dismiss_v1(p_prompt_key text)
returns public.collector_memory_prompt_state
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_key text := nullif(btrim(coalesce(p_prompt_key, '')), '');
  v_row public.collector_memory_prompt_state%rowtype;
begin
  if v_user_id is null then
    raise exception 'sign in required';
  end if;

  if v_key is null then
    raise exception 'collector memory prompt key is required';
  end if;

  update public.collector_memory_prompt_state
  set dismissed_at = coalesce(dismissed_at, now()),
      dismissed_forever = true
  where user_id = v_user_id
    and prompt_key = v_key
  returning * into v_row;

  if v_row.id is null then
    raise exception 'collector memory prompt not found';
  end if;

  return v_row;
end;
$$;

revoke all on function public.collector_memories_for_gvvi_v1(text, integer, timestamptz, uuid) from public, anon;
revoke all on function public.collector_memory_create_v1(text, public.collector_memory_type, text, text, text, text, date, text) from public, anon;
revoke all on function public.collector_memory_update_v1(uuid, text, text, text, text, date) from public, anon;
revoke all on function public.collector_memory_archive_v1(uuid) from public, anon;
revoke all on function public.collector_memory_prompt_state_v1(text) from public, anon;
revoke all on function public.collector_memory_prompt_dismiss_v1(text) from public, anon;

grant execute on function public.collector_memories_for_gvvi_v1(text, integer, timestamptz, uuid) to authenticated;
grant execute on function public.collector_memory_create_v1(text, public.collector_memory_type, text, text, text, text, date, text) to authenticated;
grant execute on function public.collector_memory_update_v1(uuid, text, text, text, text, date) to authenticated;
grant execute on function public.collector_memory_archive_v1(uuid) to authenticated;
grant execute on function public.collector_memory_prompt_state_v1(text) to authenticated;
grant execute on function public.collector_memory_prompt_dismiss_v1(text) to authenticated;

comment on function public.collector_memories_for_gvvi_v1(text, integer, timestamptz, uuid) is
'E9 owner-only private memories read RPC for one active owned GVVI. No public or feed usage.';

comment on function public.collector_memory_create_v1(text, public.collector_memory_type, text, text, text, text, date, text) is
'E9 owner-only private memory create RPC. Does not emit card_events or public activity.';

comment on function public.collector_memory_update_v1(uuid, text, text, text, text, date) is
'E9 owner-only private memory update RPC. Does not move memories between exact copies.';

comment on function public.collector_memory_archive_v1(uuid) is
'E9 owner-only private memory archive RPC.';

comment on function public.collector_memory_prompt_state_v1(text) is
'E9 owner-only private prompt read RPC. Prompts are quiet and never auto-create memories.';

comment on function public.collector_memory_prompt_dismiss_v1(text) is
'E9 owner-only private prompt dismiss RPC.';

commit;
