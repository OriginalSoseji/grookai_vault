begin;

create or replace function public.vault_set_copy_section_memberships_v1(
  p_instance_ids uuid[],
  p_section_id uuid,
  p_add boolean default true
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_requested_count integer := 0;
  v_owned_count integer := 0;
  v_changed_count integer := 0;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if p_section_id is null or p_instance_ids is null then
    raise exception 'invalid_section_assignment' using errcode = '22023';
  end if;

  select count(*)
    into v_requested_count
  from (
    select distinct instance_id
    from unnest(p_instance_ids) as requested(instance_id)
    where instance_id is not null
  ) requested_ids;

  if v_requested_count = 0 then
    raise exception 'invalid_section_assignment' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.wall_sections ws
    where ws.id = p_section_id
      and ws.user_id = v_user_id
      and ws.is_active is true
  ) then
    raise exception 'section_assignment_denied' using errcode = '42501';
  end if;

  select count(*)
    into v_owned_count
  from (
    select distinct instance_id
    from unnest(p_instance_ids) as requested(instance_id)
    where instance_id is not null
  ) requested_ids
  join public.vault_item_instances vii
    on vii.id = requested_ids.instance_id
   and vii.user_id = v_user_id
   and vii.archived_at is null;

  if v_owned_count <> v_requested_count then
    raise exception 'section_assignment_denied' using errcode = '42501';
  end if;

  if coalesce(p_add, true) then
    insert into public.wall_section_memberships (
      section_id,
      vault_item_instance_id
    )
    select p_section_id, requested_ids.instance_id
    from (
      select distinct instance_id
      from unnest(p_instance_ids) as requested(instance_id)
      where instance_id is not null
    ) requested_ids
    on conflict do nothing;

    get diagnostics v_changed_count = row_count;
  else
    delete from public.wall_section_memberships wsm
    using (
      select distinct instance_id
      from unnest(p_instance_ids) as requested(instance_id)
      where instance_id is not null
    ) requested_ids
    where wsm.section_id = p_section_id
      and wsm.vault_item_instance_id = requested_ids.instance_id;

    get diagnostics v_changed_count = row_count;
  end if;

  return v_changed_count;
end;
$$;

comment on function public.vault_set_copy_section_memberships_v1(uuid[], uuid, boolean)
is 'Owner-scoped exact-copy Wall section membership writer for app clients. Accepts vault_item_instances.id values only.';

revoke all on function public.vault_set_copy_section_memberships_v1(uuid[], uuid, boolean)
  from public, anon;
grant execute on function public.vault_set_copy_section_memberships_v1(uuid[], uuid, boolean)
  to authenticated, service_role;

commit;
