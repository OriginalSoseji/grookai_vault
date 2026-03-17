begin;

create or replace function public.resolve_active_vault_anchor_v1(
  p_user_id uuid,
  p_card_print_id uuid,
  p_gv_id text default null,
  p_condition_label text default 'NM',
  p_notes text default null,
  p_name text default null,
  p_set_name text default null,
  p_photo_url text default null,
  p_create_if_missing boolean default false
) returns public.vault_items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_anchor public.vault_items%rowtype;
  v_anchor_ids uuid[];
  v_primary_id uuid;
  v_extra_ids uuid[];
begin
  select coalesce(array_agg(id order by created_at desc, id desc), array[]::uuid[])
  into v_anchor_ids
  from public.vault_items
  where user_id = p_user_id
    and card_id = p_card_print_id
    and archived_at is null;

  if coalesce(array_length(v_anchor_ids, 1), 0) = 0 then
    if not p_create_if_missing then
      return null;
    end if;

    insert into public.vault_items (
      user_id,
      card_id,
      gv_id,
      qty,
      condition_label,
      notes,
      name,
      set_name,
      photo_url
    )
    values (
      p_user_id,
      p_card_print_id,
      p_gv_id,
      0,
      p_condition_label,
      nullif(p_notes, ''),
      p_name,
      nullif(p_set_name, ''),
      nullif(p_photo_url, '')
    )
    returning *
    into v_anchor;

    return v_anchor;
  end if;

  v_primary_id := v_anchor_ids[1];

  if coalesce(array_length(v_anchor_ids, 1), 0) > 1 then
    v_extra_ids := v_anchor_ids[2:array_length(v_anchor_ids, 1)];

    update public.vault_items
    set
      qty = 0,
      archived_at = coalesce(archived_at, now())
    where id = any(v_extra_ids)
      and archived_at is null;
  end if;

  select *
  into v_anchor
  from public.vault_items
  where id = v_primary_id;

  return v_anchor;
end;
$$;

create or replace function public.vault_add_card_instance_v1(
  p_card_print_id uuid,
  p_quantity integer default 1,
  p_condition_label text default 'NM',
  p_notes text default null,
  p_name text default null,
  p_set_name text default null,
  p_photo_url text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_quantity integer := greatest(1, coalesce(p_quantity, 1));
  v_gv_id text;
  v_name text;
  v_set_name text;
  v_bucket public.vault_items%rowtype;
  v_instance public.vault_item_instances%rowtype;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if p_card_print_id is null then
    raise exception 'p_card_print_id is required';
  end if;

  select
    cp.gv_id,
    coalesce(nullif(btrim(cp.name), ''), nullif(btrim(p_name), ''), 'Unknown card'),
    coalesce(nullif(btrim(s.name), ''), nullif(btrim(p_set_name), ''), '')
  into
    v_gv_id,
    v_name,
    v_set_name
  from public.card_prints cp
  left join public.sets s
    on s.id = cp.set_id
  where cp.id = p_card_print_id;

  if v_gv_id is null or btrim(v_gv_id) = '' then
    raise exception 'vault_card_print_missing_identity' using errcode = 'P0001';
  end if;

  select *
  into v_bucket
  from public.resolve_active_vault_anchor_v1(
    p_user_id => v_uid,
    p_card_print_id => p_card_print_id,
    p_gv_id => v_gv_id,
    p_condition_label => p_condition_label,
    p_notes => nullif(p_notes, ''),
    p_name => v_name,
    p_set_name => nullif(v_set_name, ''),
    p_photo_url => nullif(p_photo_url, ''),
    p_create_if_missing => true
  );

  for i in 1..v_quantity loop
    select *
    into v_instance
    from public.admin_vault_instance_create_v1(
      p_user_id => v_uid,
      p_card_print_id => p_card_print_id,
      p_legacy_vault_item_id => v_bucket.id,
      p_condition_label => p_condition_label,
      p_notes => nullif(p_notes, ''),
      p_name => v_name,
      p_set_name => nullif(v_set_name, ''),
      p_photo_url => nullif(p_photo_url, '')
    );
  end loop;

  update public.vault_items
  set
    qty = coalesce(public.vault_items.qty, 0) + v_quantity,
    condition_label = coalesce(p_condition_label, public.vault_items.condition_label),
    notes = coalesce(nullif(p_notes, ''), public.vault_items.notes)
  where id = v_bucket.id
    and user_id = v_uid
    and archived_at is null
  returning *
  into v_bucket;

  return jsonb_build_object(
    'gv_vi_id', v_instance.gv_vi_id,
    'created_count', v_quantity,
    'legacy_vault_item_id', v_bucket.id,
    'bucket_qty', v_bucket.qty,
    'card_print_id', p_card_print_id
  );
end;
$$;

create or replace function public.vault_archive_one_instance_v1(
  p_vault_item_id uuid default null,
  p_card_print_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_card_print_id uuid := p_card_print_id;
  v_bucket public.vault_items%rowtype;
  v_instance public.vault_item_instances%rowtype;
  v_now timestamptz := now();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if p_vault_item_id is null and p_card_print_id is null then
    raise exception 'p_vault_item_id or p_card_print_id is required';
  end if;

  if p_vault_item_id is not null then
    select *
    into v_bucket
    from public.vault_items
    where id = p_vault_item_id
      and user_id = v_uid
      and archived_at is null
    for update;

    if found then
      if v_card_print_id is null then
        v_card_print_id := v_bucket.card_id;
      elsif v_bucket.card_id <> v_card_print_id then
        raise exception 'vault_item_card_mismatch' using errcode = 'P0001';
      end if;
    end if;
  end if;

  if v_card_print_id is null then
    raise exception 'card_print_id_required_for_archive' using errcode = 'P0001';
  end if;

  select *
  into v_instance
  from public.vault_item_instances
  where user_id = v_uid
    and card_print_id = v_card_print_id
    and archived_at is null
  order by created_at asc, id asc
  limit 1
  for update;

  if not found then
    raise exception 'vault_instance_not_found_or_not_owned' using errcode = 'P0001';
  end if;

  update public.vault_item_instances
  set archived_at = v_now
  where id = v_instance.id
    and user_id = v_uid
    and archived_at is null;

  if not found then
    raise exception 'vault_instance_archive_failed' using errcode = 'P0001';
  end if;

  if not found and p_vault_item_id is null then
    null;
  end if;

  if v_card_print_id is not null then
    select *
    into v_bucket
    from public.resolve_active_vault_anchor_v1(
      p_user_id => v_uid,
      p_card_print_id => v_card_print_id,
      p_create_if_missing => false
    );
  end if;

  if v_bucket.id is not null then
    if coalesce(v_bucket.qty, 0) <= 1 then
      update public.vault_items
      set
        qty = 0,
        archived_at = coalesce(archived_at, v_now)
      where id = v_bucket.id
        and user_id = v_uid
        and archived_at is null
      returning *
      into v_bucket;
    else
      update public.vault_items
      set qty = v_bucket.qty - 1
      where id = v_bucket.id
        and user_id = v_uid
        and archived_at is null
      returning *
      into v_bucket;
    end if;
  end if;

  return jsonb_build_object(
    'archived_instance_id', v_instance.id,
    'gv_vi_id', v_instance.gv_vi_id,
    'card_print_id', v_card_print_id,
    'legacy_vault_item_id', v_bucket.id,
    'bucket_qty', v_bucket.qty,
    'bucket_archived_at', v_bucket.archived_at
  );
end;
$$;

create or replace function public.vault_archive_all_instances_v1(
  p_vault_item_id uuid default null,
  p_card_print_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_card_print_id uuid := p_card_print_id;
  v_bucket public.vault_items%rowtype;
  v_archived_count integer := 0;
  v_now timestamptz := now();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if p_vault_item_id is null and p_card_print_id is null then
    raise exception 'p_vault_item_id or p_card_print_id is required';
  end if;

  if p_vault_item_id is not null then
    select *
    into v_bucket
    from public.vault_items
    where id = p_vault_item_id
      and user_id = v_uid
      and archived_at is null
    for update;

    if found then
      if v_card_print_id is null then
        v_card_print_id := v_bucket.card_id;
      elsif v_bucket.card_id <> v_card_print_id then
        raise exception 'vault_item_card_mismatch' using errcode = 'P0001';
      end if;
    end if;
  end if;

  if v_card_print_id is null then
    raise exception 'card_print_id_required_for_archive' using errcode = 'P0001';
  end if;

  update public.vault_item_instances
  set archived_at = v_now
  where user_id = v_uid
    and card_print_id = v_card_print_id
    and archived_at is null;

  get diagnostics v_archived_count = row_count;

  if v_archived_count <= 0 then
    raise exception 'vault_instance_not_found_or_not_owned' using errcode = 'P0001';
  end if;

  if v_card_print_id is not null then
    select *
    into v_bucket
    from public.resolve_active_vault_anchor_v1(
      p_user_id => v_uid,
      p_card_print_id => v_card_print_id,
      p_create_if_missing => false
    );
  end if;

  if v_bucket.id is not null then
    update public.vault_items
    set
      qty = 0,
      archived_at = coalesce(archived_at, v_now)
    where id = v_bucket.id
      and user_id = v_uid
      and archived_at is null
    returning *
    into v_bucket;
  end if;

  return jsonb_build_object(
    'archived_count', v_archived_count,
    'card_print_id', v_card_print_id,
    'legacy_vault_item_id', v_bucket.id,
    'bucket_qty', v_bucket.qty,
    'bucket_archived_at', v_bucket.archived_at
  );
end;
$$;

revoke all on function public.vault_add_card_instance_v1(uuid, integer, text, text, text, text, text)
from public, anon;

grant execute on function public.vault_add_card_instance_v1(uuid, integer, text, text, text, text, text)
to authenticated, service_role;

revoke all on function public.resolve_active_vault_anchor_v1(uuid, uuid, text, text, text, text, text, text, boolean)
from public, anon;

grant execute on function public.resolve_active_vault_anchor_v1(uuid, uuid, text, text, text, text, text, text, boolean)
to authenticated, service_role;

revoke all on function public.vault_archive_one_instance_v1(uuid, uuid)
from public, anon;

grant execute on function public.vault_archive_one_instance_v1(uuid, uuid)
to authenticated, service_role;

revoke all on function public.vault_archive_all_instances_v1(uuid, uuid)
from public, anon;

grant execute on function public.vault_archive_all_instances_v1(uuid, uuid)
to authenticated, service_role;

commit;
