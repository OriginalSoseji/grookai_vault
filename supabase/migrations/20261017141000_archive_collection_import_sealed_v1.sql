begin;

create or replace function public.admin_archive_collection_import_new_instances_v1(
  p_user_id uuid,
  p_source_sha256 text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_total integer := 0;
  v_active_before integer := 0;
  v_archived_now integer := 0;
  v_already_archived integer := 0;
  v_card_total integer := 0;
  v_sealed_total integer := 0;
  v_card_active_before integer := 0;
  v_sealed_active_before integer := 0;
  v_reused_group_count integer := 0;
  v_reused_copy_count integer := 0;
  v_sealed_archived_now integer := 0;
  v_request_id uuid;
  v_instance_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_user_id is null or coalesce(p_source_sha256, '') !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_collection_import_source' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.vault_collection_import_documents_v2 d
    where d.user_id = p_user_id and d.source_sha256 = p_source_sha256
  ) then
    raise exception 'collection_import_source_not_found' using errcode = 'P0002';
  end if;

  create temp table _collection_import_archive_targets (
    instance_id uuid primary key
  ) on commit drop;

  insert into _collection_import_archive_targets(instance_id)
  select distinct u.instance_id
  from public.vault_collection_import_groups_v2 g
  cross join lateral unnest(
    case
      when g.added_count > 0 then
        g.instance_ids[
          cardinality(g.instance_ids) - g.added_count + 1:
          cardinality(g.instance_ids)
        ]
      else '{}'::uuid[]
    end
  ) as u(instance_id)
  where g.user_id = p_user_id and g.source_sha256 = p_source_sha256;

  select
    count(*)::integer,
    count(*) filter (where i.archived_at is null)::integer,
    count(*) filter (where i.archived_at is not null)::integer,
    count(*) filter (where i.card_print_id is not null)::integer,
    count(*) filter (where i.card_print_id is null)::integer,
    count(*) filter (where i.archived_at is null and i.card_print_id is not null)::integer,
    count(*) filter (where i.archived_at is null and i.card_print_id is null)::integer
  into v_total, v_active_before, v_already_archived, v_card_total, v_sealed_total,
       v_card_active_before, v_sealed_active_before
  from _collection_import_archive_targets t
  join public.vault_item_instances i on i.id = t.instance_id and i.user_id = p_user_id;

  select
    count(*) filter (where g.added_count = 0)::integer,
    coalesce(sum(case when g.added_count = 0 then cardinality(g.instance_ids) else 0 end), 0)::integer
  into v_reused_group_count, v_reused_copy_count
  from public.vault_collection_import_groups_v2 g
  where g.user_id = p_user_id and g.source_sha256 = p_source_sha256;

  update public.vault_item_instances i
  set archived_at = v_now, updated_at = v_now
  from _collection_import_archive_targets t
  where i.id = t.instance_id and i.user_id = p_user_id
    and i.card_print_id is not null and i.archived_at is null;
  get diagnostics v_archived_now = row_count;

  -- Sealed ownership has an append-only lifecycle contract. Bind a remove
  -- request before updating each imported sealed copy so the normal guard and
  -- future audit/read models see the same evidence as a user-initiated remove.
  for v_instance_id in
    select i.id
    from _collection_import_archive_targets t
    join public.vault_item_instances i on i.id = t.instance_id and i.user_id = p_user_id
    where i.sealed_product_variant_id is not null and i.archived_at is null
    for update of i
  loop
    v_request_id := gen_random_uuid();
    insert into public.vault_sealed_requests_v1(user_id, request_id, operation, payload, result)
    values (
      p_user_id,
      v_request_id,
      'remove',
      jsonb_build_object('instance_id', v_instance_id, 'source', 'collection_import_cleanup', 'source_sha256', p_source_sha256),
      jsonb_build_object('instance_id', v_instance_id, 'operation', 'remove', 'archived', true)
    );
    update public.vault_item_instances
    set archived_at = v_now, intent = 'hold', updated_at = v_now
    where id = v_instance_id and user_id = p_user_id and archived_at is null;
    if not found then raise exception 'sealed_archive_failed'; end if;
    v_sealed_archived_now := v_sealed_archived_now + 1;
  end loop;

  -- Keep legacy grouped quantities coherent for imported card copies.
  with target_anchors as (
    select distinct i.legacy_vault_item_id
    from _collection_import_archive_targets t
    join public.vault_item_instances i on i.id = t.instance_id
    where i.user_id = p_user_id and i.legacy_vault_item_id is not null
  )
  update public.vault_items v
  set qty = (
    select count(*)::integer from public.vault_item_instances i
    where i.user_id = p_user_id and i.legacy_vault_item_id = v.id and i.archived_at is null
  ),
      archived_at = case when (
        select count(*) from public.vault_item_instances i
        where i.user_id = p_user_id and i.legacy_vault_item_id = v.id and i.archived_at is null
      ) = 0 then coalesce(v.archived_at, v_now) else null end
  from target_anchors a
  where v.id = a.legacy_vault_item_id and v.user_id = p_user_id;

  return jsonb_build_object(
    'source_sha256', p_source_sha256,
    'owner_user_id', p_user_id,
    'new_instance_count', v_total,
    'active_before', v_active_before,
    'archived_now', v_archived_now + v_sealed_archived_now,
    'archived_card_now', v_archived_now,
    'archived_sealed_now', v_sealed_archived_now,
    'already_archived', v_already_archived,
    'new_card_count', v_card_total,
    'new_sealed_count', v_sealed_total,
    'active_card_before', v_card_active_before,
    'active_sealed_before', v_sealed_active_before,
    'reused_group_count_left_untouched', v_reused_group_count,
    'reused_copy_count_left_untouched', v_reused_copy_count
  );
end;
$$;

commit;
