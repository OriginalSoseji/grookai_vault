begin;

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
  card_printing_id uuid,
  printing_gv_id text,
  finish_key text,
  finish_label text,
  printing_identity_status text,
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
    vii.card_printing_id,
    cpn.printing_gv_id,
    cpn.finish_key,
    fk.label as finish_label,
    case
      when vii.card_printing_id is null then 'unassigned'
      else 'exact'
    end as printing_identity_status,
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
  left join public.card_printings cpn
    on cpn.id = vii.card_printing_id
   and cpn.card_print_id = vii.card_print_id
  left join public.finish_keys fk
    on fk.key = cpn.finish_key
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
'Owner-only Memory feed with the exact printing identity already assigned to each active linked vault instance.';

drop function if exists public.collector_memory_accessible_by_id_v1(uuid);

create function public.collector_memory_accessible_by_id_v1(
  p_memory_id uuid
)
returns table (
  id uuid,
  vault_item_instance_id uuid,
  gv_vi_id text,
  card_print_id uuid,
  card_name text,
  set_name text,
  card_image_url text,
  card_printing_id uuid,
  printing_gv_id text,
  finish_key text,
  finish_label text,
  printing_identity_status text,
  gv_id text,
  owner_user_id uuid,
  owner_slug text,
  owner_display_name text,
  viewer_is_owner boolean,
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
  updated_at timestamptz
)
language sql
stable
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
    vii.card_printing_id,
    cpn.printing_gv_id,
    cpn.finish_key,
    fk.label as finish_label,
    case
      when vii.card_printing_id is null then 'unassigned'
      else 'exact'
    end as printing_identity_status,
    cp.gv_id,
    cm.user_id as owner_user_id,
    owner_profile.slug as owner_slug,
    owner_profile.display_name as owner_display_name,
    (cm.user_id = auth.uid()) as viewer_is_owner,
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
    cm.updated_at
  from public.collector_memories cm
  join public.vault_item_instances vii
    on vii.id = cm.vault_item_instance_id
   and vii.user_id = cm.user_id
   and vii.archived_at is null
   and vii.card_print_id is not null
  join public.card_prints cp
    on cp.id = vii.card_print_id
  left join public.sets s
    on s.id = cp.set_id
  left join public.card_printings cpn
    on cpn.id = vii.card_printing_id
   and cpn.card_print_id = vii.card_print_id
  left join public.finish_keys fk
    on fk.key = cpn.finish_key
  left join public.public_profiles owner_profile
    on owner_profile.user_id = cm.user_id
  left join public.card_events publication_event
    on publication_event.id = cm.publication_event_id
   and publication_event.event_type = 'collector_memory_published'
   and publication_event.actor_user_id = cm.user_id
   and publication_event.card_print_id = vii.card_print_id
   and publication_event.visibility = 'public'
   and (publication_event.payload ->> 'memory_id') = cm.id::text
   and (publication_event.payload ->> 'publication_version') =
     cm.publication_version::text
  where auth.uid() is not null
    and cm.id = p_memory_id
    and cm.archived_at is null
    and (
      cm.user_id = auth.uid()
      or (
        cm.is_public is true
        and cm.published_at is not null
        and cm.publication_event_id = publication_event.id
        and public.interest_graph_collectors_visible_to_viewer_v1(
          auth.uid(),
          cm.user_id,
          null
        )
      )
    )
  limit 1;
$$;

revoke all on function public.collector_memory_accessible_by_id_v1(uuid)
from public, anon;
grant execute on function public.collector_memory_accessible_by_id_v1(uuid)
to authenticated;

comment on function public.collector_memory_accessible_by_id_v1(uuid) is
'Governed signed-in Memory route read with the linked vault instance exact printing identity.';

commit;
