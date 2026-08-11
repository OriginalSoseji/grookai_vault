begin;

alter table public.collector_memories
  add column if not exists is_public boolean not null default false,
  add column if not exists published_at timestamptz null,
  add column if not exists publication_version integer not null default 0,
  add column if not exists publication_event_id uuid null
    references public.card_events(id);

alter table public.collector_memories
  drop constraint if exists collector_memories_publication_state_check;

alter table public.collector_memories
  add constraint collector_memories_publication_state_check
  check (
    publication_version >= 0
    and (
      (
      is_public is false
      and published_at is null
      and publication_event_id is null
      )
      or (
        is_public is true
        and published_at is not null
        and publication_event_id is not null
        and publication_version > 0
      )
    )
  );

create index if not exists collector_memories_public_event_idx
  on public.collector_memories (publication_event_id)
  where is_public is true and archived_at is null;

comment on type public.collector_memory_type is
'Collector memory kinds. Memories remain owner-private by default and may be explicitly published by their owner.';

comment on table public.collector_memories is
'Exact-copy collector memories. Rows remain owner-only; explicit publication is exposed only through governed Pulse and signed-photo contracts.';

comment on column public.collector_memories.is_public is
'Owner-controlled publication state. False by default for all existing and new memories.';

comment on column public.collector_memories.publication_event_id is
'Current append-only collector_memory_published event. Pulse requires this exact event to remain current.';

drop function if exists public.collector_memories_for_gvvi_v1(
  text,
  integer,
  timestamptz,
  uuid
);

create function public.collector_memories_for_gvvi_v1(
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
  is_public boolean,
  published_at timestamptz,
  publication_version integer,
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
    cm.is_public,
    cm.published_at,
    cm.publication_version,
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
      or (cm.created_at, cm.id) < (
        p_before_created_at,
        coalesce(p_before_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)
      )
    )
  order by cm.created_at desc, cm.id desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

revoke all on function public.collector_memories_for_gvvi_v1(
  text,
  integer,
  timestamptz,
  uuid
) from public, anon;
grant execute on function public.collector_memories_for_gvvi_v1(
  text,
  integer,
  timestamptz,
  uuid
) to authenticated;

comment on function public.collector_memories_for_gvvi_v1(
  text,
  integer,
  timestamptz,
  uuid
) is
'Owner-only collector Memory read for one active exact copy, including the owner-controlled publication state.';

drop function if exists public.collector_memories_for_owner_v1(
  integer,
  timestamptz,
  uuid
);

create function public.collector_memories_for_owner_v1(
  p_limit integer default 50,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null
)
returns table (
  id uuid,
  vault_item_instance_id uuid,
  gv_vi_id text,
  card_print_id uuid,
  card_name text,
  set_name text,
  card_image_url text,
  memory_type public.collector_memory_type,
  note text,
  photo_path text,
  place_label text,
  occasion_label text,
  memory_date date,
  prompt_key text,
  is_public boolean,
  published_at timestamptz,
  publication_version integer,
  created_at timestamptz,
  updated_at timestamptz,
  cursor_created_at timestamptz,
  cursor_id uuid
)
language sql
security definer
set search_path = public
as $$
  select
    cm.id,
    cm.vault_item_instance_id,
    vii.gv_vi_id,
    vii.card_print_id,
    coalesce(cp.name, 'Card memory') as card_name,
    coalesce(s.name, cp.set_code, '') as set_name,
    coalesce(cp.image_url, cp.image_alt_url) as card_image_url,
    cm.memory_type,
    cm.note,
    cm.photo_path,
    cm.place_label,
    cm.occasion_label,
    cm.memory_date,
    cm.prompt_key,
    cm.is_public,
    cm.published_at,
    cm.publication_version,
    cm.created_at,
    cm.updated_at,
    cm.created_at as cursor_created_at,
    cm.id as cursor_id
  from public.collector_memories cm
  join public.vault_item_instances vii
    on vii.id = cm.vault_item_instance_id
   and vii.user_id = auth.uid()
   and vii.archived_at is null
  left join public.card_prints cp
    on cp.id = vii.card_print_id
  left join public.sets s
    on s.id = cp.set_id
  where auth.uid() is not null
    and cm.user_id = auth.uid()
    and cm.archived_at is null
    and (
      p_before_created_at is null
      or (cm.created_at, cm.id) < (
        p_before_created_at,
        coalesce(p_before_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)
      )
    )
  order by cm.created_at desc, cm.id desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

revoke all on function public.collector_memories_for_owner_v1(
  integer,
  timestamptz,
  uuid
) from public, anon;
grant execute on function public.collector_memories_for_owner_v1(
  integer,
  timestamptz,
  uuid
) to authenticated;

comment on function public.collector_memories_for_owner_v1(
  integer,
  timestamptz,
  uuid
) is
'Owner-only collector Memory feed across active exact copies, including the owner-controlled publication state. Memory rows are never directly public.';

create or replace function public.collector_memory_set_public_v1(
  p_memory_id uuid,
  p_is_public boolean
)
returns public.collector_memories
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_memory public.collector_memories%rowtype;
  v_instance public.vault_item_instances%rowtype;
  v_event_id uuid;
  v_next_version integer;
begin
  if v_user_id is null then
    raise exception 'sign in required';
  end if;

  select *
  into v_memory
  from public.collector_memories
  where id = p_memory_id
    and user_id = v_user_id
    and archived_at is null
  for update;

  if v_memory.id is null then
    raise exception 'collector memory not found';
  end if;

  if p_is_public is not true then
    if v_memory.is_public is false then
      return v_memory;
    end if;

    update public.collector_memories
    set
      is_public = false,
      published_at = null,
      publication_event_id = null
    where id = v_memory.id
      and user_id = v_user_id
    returning * into v_memory;

    return v_memory;
  end if;

  if v_memory.is_public is true then
    return v_memory;
  end if;

  if public.interest_graph_collector_public_v1(v_user_id) is false then
    raise exception 'enable your public profile and vault sharing before publishing a Memory';
  end if;

  select *
  into v_instance
  from public.vault_item_instances
  where id = v_memory.vault_item_instance_id
    and user_id = v_user_id
    and archived_at is null
    and card_print_id is not null
  limit 1;

  if v_instance.id is null then
    raise exception 'collector memory active exact copy not found';
  end if;

  v_event_id := gen_random_uuid();
  v_next_version := v_memory.publication_version + 1;

  insert into public.card_events (
    id,
    event_type,
    card_print_id,
    actor_user_id,
    subject_user_id,
    payload,
    visibility,
    dedupe_key
  ) values (
    v_event_id,
    'collector_memory_published',
    v_instance.card_print_id,
    v_user_id,
    null,
    jsonb_build_object(
      'memory_id', v_memory.id,
      'publication_version', v_next_version,
      'gvvi_id', v_instance.gv_vi_id
    ),
    'public',
    concat_ws(
      ':',
      'collector-memory-published',
      v_memory.id::text,
      v_next_version::text
    )
  );

  update public.collector_memories
  set
    is_public = true,
    published_at = now(),
    publication_version = v_next_version,
    publication_event_id = v_event_id
  where id = v_memory.id
    and user_id = v_user_id
  returning * into v_memory;

  return v_memory;
end;
$$;

revoke all on function public.collector_memory_set_public_v1(uuid, boolean)
from public, anon;
grant execute on function public.collector_memory_set_public_v1(uuid, boolean)
to authenticated;

comment on function public.collector_memory_set_public_v1(uuid, boolean) is
'Owner-only publication switch. Publishing requires current public collector visibility and creates one current append-only Pulse event; unpublishing invalidates that event without deleting history.';

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
  set
    archived_at = coalesce(archived_at, now()),
    is_public = false,
    published_at = null,
    publication_event_id = null
  where id = p_memory_id
    and user_id = v_user_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'collector memory not found';
  end if;

  return v_row;
end;
$$;

revoke all on function public.collector_memory_archive_v1(uuid)
from public, anon;
grant execute on function public.collector_memory_archive_v1(uuid)
to authenticated;

drop policy if exists collector_memory_images_published_select_v1
on storage.objects;

create policy collector_memory_images_published_select_v1
on storage.objects
for select
to authenticated
using (
  bucket_id = 'collector-memory-images'
  and exists (
    select 1
    from public.collector_memories cm
    join public.vault_item_instances vii
      on vii.id = cm.vault_item_instance_id
     and vii.user_id = cm.user_id
     and vii.archived_at is null
     and vii.card_print_id is not null
    join public.card_events e
      on e.id = cm.publication_event_id
     and e.event_type = 'collector_memory_published'
     and e.actor_user_id = cm.user_id
     and e.visibility = 'public'
     and (e.payload ->> 'publication_version') = cm.publication_version::text
    where cm.photo_path = name
      and cm.is_public is true
      and cm.archived_at is null
      and public.interest_graph_collectors_visible_to_viewer_v1(
        auth.uid(),
        cm.user_id,
        null
      )
  )
);

alter function public.pulse_eligible_events_for_viewer_v1(uuid)
rename to collector_memory_pulse_base_eligible_events_v1;

create or replace function public.pulse_eligible_events_for_viewer_v1(
  p_viewer_user_id uuid
)
returns table (
  card_event_id uuid,
  event_type text,
  rank_bucket text,
  bucket_rank integer,
  created_at timestamptz,
  actor_user_id uuid,
  actor_slug text,
  actor_display_name text,
  actor_avatar_path text,
  subject_user_id uuid,
  subject_slug text,
  subject_display_name text,
  card_print_id uuid,
  gv_id text,
  card_name text,
  set_code text,
  set_name text,
  card_number text,
  display_image_url text,
  display_image_kind text,
  ownership_context text,
  distance_bucket text,
  locality_label text,
  value_delta_amount numeric,
  value_delta_percent numeric,
  completion_subject_type text,
  completion_subject_label text,
  completion_threshold numeric,
  primary_action text,
  primary_action_label text,
  primary_action_route text,
  payload jsonb,
  visibility text,
  watch_subject_type text,
  watch_subject_id uuid,
  watch_strength double precision
)
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.collector_memory_pulse_base_eligible_events_v1(
    p_viewer_user_id
  )

  union all

  select
    e.id as card_event_id,
    e.event_type,
    'collector_activity'::text as rank_bucket,
    2::integer as bucket_rank,
    e.created_at,
    e.actor_user_id,
    actor_profile.slug as actor_slug,
    actor_profile.display_name as actor_display_name,
    actor_profile.avatar_path as actor_avatar_path,
    null::uuid as subject_user_id,
    null::text as subject_slug,
    null::text as subject_display_name,
    cp.id as card_print_id,
    cp.gv_id,
    cp.name as card_name,
    cp.set_code,
    s.name as set_name,
    cp.number as card_number,
    coalesce(cp.image_url, cp.image_alt_url) as display_image_url,
    case
      when nullif(btrim(coalesce(cp.image_url, cp.image_alt_url)), '') is not null
        then 'exact'
      else 'missing'
    end::text as display_image_kind,
    'memory'::text as ownership_context,
    null::text as distance_bucket,
    null::text as locality_label,
    null::numeric as value_delta_amount,
    null::numeric as value_delta_percent,
    null::text as completion_subject_type,
    null::text as completion_subject_label,
    null::numeric as completion_threshold,
    'open_memory'::text as primary_action,
    'View memory'::text as primary_action_label,
    null::text as primary_action_route,
    e.payload || jsonb_strip_nulls(
      jsonb_build_object(
        'memory_type', cm.memory_type::text,
        'memory_note', cm.note,
        'memory_photo_path', cm.photo_path,
        'memory_place_label', cm.place_label,
        'memory_occasion_label', cm.occasion_label,
        'memory_date', cm.memory_date,
        'published_at', cm.published_at,
        'gvvi_id', vii.gv_vi_id
      )
    ) as payload,
    e.visibility,
    selected_watch.subject_type as watch_subject_type,
    selected_watch.subject_id as watch_subject_id,
    selected_watch.strength as watch_strength
  from public.card_events e
  join public.collector_memories cm
    on cm.id = public.pulse_jsonb_uuid_v1(e.payload ->> 'memory_id')
   and cm.user_id = e.actor_user_id
   and cm.is_public is true
   and cm.archived_at is null
   and cm.publication_event_id = e.id
   and (e.payload ->> 'publication_version') = cm.publication_version::text
  join public.vault_item_instances vii
    on vii.id = cm.vault_item_instance_id
   and vii.user_id = cm.user_id
   and vii.archived_at is null
   and vii.card_print_id = e.card_print_id
  join public.card_prints cp
    on cp.id = vii.card_print_id
  left join public.sets s
    on s.id = cp.set_id
  left join public.public_profiles actor_profile
    on actor_profile.user_id = e.actor_user_id
  join lateral (
    select
      w.subject_type,
      w.subject_id,
      w.strength
    from public.watches w
    where w.user_id = p_viewer_user_id
      and w.muted_at is null
      and (
        (w.subject_type = 'collector' and w.subject_id = e.actor_user_id)
        or (w.subject_type = 'card' and w.subject_id = e.card_print_id)
        or (w.subject_type = 'set' and w.subject_id = cp.set_id)
      )
    order by w.strength desc, w.created_at desc
    limit 1
  ) selected_watch on true
  where e.event_type = 'collector_memory_published'
    and e.visibility = 'public'
    and public.interest_graph_collector_public_v1(e.actor_user_id)
    and public.interest_graph_card_event_visible_to_viewer_v1(
      p_viewer_user_id,
      e.actor_user_id,
      e.subject_user_id,
      e.visibility
    )
    and not exists (
      select 1
      from public.watches muted_card_watch
      where muted_card_watch.user_id = p_viewer_user_id
        and muted_card_watch.subject_type = 'card'
        and muted_card_watch.subject_id = e.card_print_id
        and muted_card_watch.muted_at is not null
    );
$$;

comment on function public.pulse_eligible_events_for_viewer_v1(uuid) is
'Pulse eligibility including current owner-published collector Memories. Historical events are ineligible unless they remain the active publication event for an active public Memory.';

revoke all on function public.collector_memory_pulse_base_eligible_events_v1(uuid)
from public, anon, authenticated;
revoke all on function public.pulse_eligible_events_for_viewer_v1(uuid)
from public, anon, authenticated;
grant execute on function public.collector_memory_pulse_base_eligible_events_v1(uuid)
to service_role;
grant execute on function public.pulse_eligible_events_for_viewer_v1(uuid)
to service_role;

commit;
