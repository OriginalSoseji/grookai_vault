begin;

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
  v_remaining_count integer := 0;
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

  select vii.*
  into v_instance
  from public.vault_item_instances vii
  where vii.user_id = v_uid
    and vii.archived_at is null
    and (
      vii.card_print_id = v_card_print_id
      or (
        vii.card_print_id is null
        and exists (
          select 1
          from public.slab_certs sc
          where sc.id = vii.slab_cert_id
            and sc.card_print_id = v_card_print_id
        )
      )
    )
  order by vii.created_at asc, vii.id asc
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

  if v_bucket.id is null then
    select *
    into v_bucket
    from public.vault_items
    where user_id = v_uid
      and card_id = v_card_print_id
      and archived_at is null
    for update;
  end if;

  select count(*)
  into v_remaining_count
  from public.vault_item_instances vii
  left join public.slab_certs sc
    on sc.id = vii.slab_cert_id
  where vii.user_id = v_uid
    and vii.archived_at is null
    and coalesce(vii.card_print_id, sc.card_print_id) = v_card_print_id;

  if v_bucket.id is not null then
    if v_remaining_count <= 0 then
      update public.vault_items
      set
        qty = 0,
        archived_at = coalesce(archived_at, v_now)
      where id = v_bucket.id
        and user_id = v_uid
      returning *
      into v_bucket;
    else
      update public.vault_items
      set
        qty = v_remaining_count,
        archived_at = null
      where id = v_bucket.id
        and user_id = v_uid
      returning *
      into v_bucket;
    end if;
  end if;

  return jsonb_build_object(
    'archived_instance_id', v_instance.id,
    'gv_vi_id', v_instance.gv_vi_id,
    'card_print_id', v_card_print_id,
    'legacy_vault_item_id', v_bucket.id,
    'remaining_active_count', v_remaining_count,
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

  update public.vault_item_instances vii
  set archived_at = v_now
  where vii.user_id = v_uid
    and vii.archived_at is null
    and (
      vii.card_print_id = v_card_print_id
      or (
        vii.card_print_id is null
        and exists (
          select 1
          from public.slab_certs sc
          where sc.id = vii.slab_cert_id
            and sc.card_print_id = v_card_print_id
        )
      )
    );

  get diagnostics v_archived_count = row_count;

  if v_archived_count <= 0 then
    raise exception 'vault_instance_not_found_or_not_owned' using errcode = 'P0001';
  end if;

  if v_bucket.id is null then
    select *
    into v_bucket
    from public.vault_items
    where user_id = v_uid
      and card_id = v_card_print_id
      and archived_at is null
    for update;
  end if;

  if v_bucket.id is not null then
    update public.vault_items
    set
      qty = 0,
      archived_at = coalesce(archived_at, v_now)
    where id = v_bucket.id
      and user_id = v_uid
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

revoke all on function public.vault_archive_one_instance_v1(uuid, uuid)
from public, anon;

revoke all on function public.vault_archive_all_instances_v1(uuid, uuid)
from public, anon;

grant execute on function public.vault_archive_one_instance_v1(uuid, uuid)
to authenticated, service_role;

grant execute on function public.vault_archive_all_instances_v1(uuid, uuid)
to authenticated, service_role;

commit;
