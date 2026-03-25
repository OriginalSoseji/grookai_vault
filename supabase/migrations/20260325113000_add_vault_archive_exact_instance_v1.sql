begin;

create or replace function public.vault_archive_exact_instance_v1(
  p_instance_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
  v_instance public.vault_item_instances%rowtype;
  v_bucket public.vault_items%rowtype;
  v_slab public.slab_certs%rowtype;
  v_card_print_id uuid;
  v_remaining_count integer := 0;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if p_instance_id is null then
    raise exception 'instance_id_required' using errcode = 'P0001';
  end if;

  select *
  into v_instance
  from public.vault_item_instances
  where id = p_instance_id
    and user_id = v_uid
  for update;

  if not found then
    raise exception 'vault_instance_not_found_or_not_owned' using errcode = 'P0001';
  end if;

  if v_instance.archived_at is not null then
    raise exception 'vault_instance_already_archived' using errcode = 'P0001';
  end if;

  if v_instance.slab_cert_id is not null then
    select *
    into v_slab
    from public.slab_certs
    where id = v_instance.slab_cert_id;
  end if;

  v_card_print_id := coalesce(v_instance.card_print_id, v_slab.card_print_id);

  if v_card_print_id is null then
    raise exception 'vault_instance_missing_card_print' using errcode = 'P0001';
  end if;

  if v_instance.legacy_vault_item_id is not null then
    select *
    into v_bucket
    from public.vault_items
    where id = v_instance.legacy_vault_item_id
      and user_id = v_uid
    for update;
  end if;

  update public.vault_item_instances
  set archived_at = v_now
  where id = v_instance.id
    and user_id = v_uid
    and archived_at is null;

  if not found then
    raise exception 'vault_instance_archive_failed' using errcode = 'P0001';
  end if;

  if v_instance.legacy_vault_item_id is not null then
    select count(*)
    into v_remaining_count
    from public.vault_item_instances
    where user_id = v_uid
      and legacy_vault_item_id = v_instance.legacy_vault_item_id
      and archived_at is null;

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
  end if;

  return jsonb_build_object(
    'archived_instance_id', v_instance.id,
    'gv_vi_id', v_instance.gv_vi_id,
    'card_print_id', v_card_print_id,
    'legacy_vault_item_id', v_instance.legacy_vault_item_id,
    'remaining_active_count', v_remaining_count,
    'bucket_qty', v_bucket.qty,
    'bucket_archived_at', v_bucket.archived_at
  );
end;
$$;

revoke all on function public.vault_archive_exact_instance_v1(uuid)
from public, anon;

grant execute on function public.vault_archive_exact_instance_v1(uuid)
to authenticated, service_role;

commit;
