begin;

-- Archive only the exact copies created by one persisted collection-import source.
-- Import groups keep the original source evidence and their instance order: the
-- importer appends newly created copies after any pre-existing matches, so the
-- final added_count entries are the rows this source created. This deliberately
-- leaves reused inventory copies untouched and never deletes canonical catalog
-- rows or import evidence.
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
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_user_id is null or coalesce(p_source_sha256, '') !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_collection_import_source' using errcode = '22023';
  end if;
  if not exists (
    select 1
    from public.vault_collection_import_documents_v2 d
    where d.user_id = p_user_id
      and d.source_sha256 = p_source_sha256
  ) then
    raise exception 'collection_import_source_not_found' using errcode = 'P0002';
  end if;

  with target_ids as (
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
    where g.user_id = p_user_id
      and g.source_sha256 = p_source_sha256
  )
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
  from target_ids t
  join public.vault_item_instances i
    on i.id = t.instance_id
   and i.user_id = p_user_id;

  select
    count(*) filter (where g.added_count = 0)::integer,
    coalesce(sum(case when g.added_count = 0 then cardinality(g.instance_ids) else 0 end), 0)::integer
  into v_reused_group_count, v_reused_copy_count
  from public.vault_collection_import_groups_v2 g
  where g.user_id = p_user_id
    and g.source_sha256 = p_source_sha256;

  with target_ids as (
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
    where g.user_id = p_user_id
      and g.source_sha256 = p_source_sha256
  )
  update public.vault_item_instances i
  set archived_at = coalesce(i.archived_at, v_now),
      updated_at = v_now
  from target_ids t
  where i.id = t.instance_id
    and i.user_id = p_user_id
    and i.archived_at is null;
  get diagnostics v_archived_now = row_count;

  -- Keep legacy grouped quantities coherent for imported card copies. Sealed
  -- instances have no legacy bucket and are unaffected by this update.
  with target_anchors as (
    select distinct i.legacy_vault_item_id
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
    join public.vault_item_instances i on i.id = u.instance_id
    where g.user_id = p_user_id
      and g.source_sha256 = p_source_sha256
      and i.user_id = p_user_id
      and i.legacy_vault_item_id is not null
  )
  update public.vault_items v
  set qty = (
    select count(*)::integer
    from public.vault_item_instances i
    where i.user_id = p_user_id
      and i.legacy_vault_item_id = v.id
      and i.archived_at is null
  ),
      archived_at = case
        when (
          select count(*)
          from public.vault_item_instances i
          where i.user_id = p_user_id
            and i.legacy_vault_item_id = v.id
            and i.archived_at is null
        ) = 0 then coalesce(v.archived_at, v_now)
        else null
      end
  from target_anchors a
  where v.id = a.legacy_vault_item_id
    and v.user_id = p_user_id;

  return jsonb_build_object(
    'source_sha256', p_source_sha256,
    'owner_user_id', p_user_id,
    'new_instance_count', v_total,
    'active_before', v_active_before,
    'archived_now', v_archived_now,
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

revoke all on function public.admin_archive_collection_import_new_instances_v1(uuid, text)
from public, anon, authenticated;
grant execute on function public.admin_archive_collection_import_new_instances_v1(uuid, text)
to service_role;

comment on function public.admin_archive_collection_import_new_instances_v1(uuid, text) is
'Service-only cleanup for an owner-approved collection import. Archives only copies appended by the import and preserves source evidence, prior matches, and catalog data.';

commit;
