create or replace function public.collector_memories_for_owner_v1(
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

revoke all on function public.collector_memories_for_owner_v1(integer, timestamptz, uuid) from public, anon;
grant execute on function public.collector_memories_for_owner_v1(integer, timestamptz, uuid) to authenticated;

comment on function public.collector_memories_for_owner_v1(integer, timestamptz, uuid) is
'Owner-only private collector memory feed across all active exact copies. Does not expose memories publicly.';
