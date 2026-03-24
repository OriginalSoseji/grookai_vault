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

revoke all on function public.resolve_active_vault_anchor_v1(uuid, uuid, text, text, text, text, text, text, boolean)
from public, anon;

grant execute on function public.resolve_active_vault_anchor_v1(uuid, uuid, text, text, text, text, text, text, boolean)
to authenticated, service_role;

commit;
