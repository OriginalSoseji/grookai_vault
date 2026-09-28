begin;

-- One desired-total import is one transaction. The owner row is also locked by
-- the existing canonical instance creator, so overlapping imports cannot both
-- calculate their deficits from the same stale count. Retrying after a lost
-- response reconciles against committed copies; it never replays an additive delta.
create or replace function public.admin_import_vault_targets_v1(p_user_id uuid, p_rows jsonb)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  r jsonb;
  c public.card_prints%rowtype;
  anchor uuid;
  desired integer;
  owned integer;
  delta integer;
  added integer := 0;
  entries integer := 0;
  targets jsonb := '[]'::jsonb;
begin
  if p_user_id is null or jsonb_typeof(p_rows) is distinct from 'array'
     or jsonb_array_length(p_rows) > 5000 then
    raise exception 'invalid_import_targets';
  end if;
  if exists(select 1 from jsonb_array_elements(p_rows) x
    where jsonb_typeof(x->'desiredQuantity') is distinct from 'number'
       or (x->>'desiredQuantity') !~ '^[1-9][0-9]*$') then
    raise exception 'invalid_import_quantity';
  end if;
  if (select coalesce(sum((x->>'desiredQuantity')::numeric),0) from jsonb_array_elements(p_rows) x)>50000 then
    raise exception 'import_quantity_limit';
  end if;
  if (select count(*) from jsonb_array_elements(p_rows)) <>
     (select count(distinct x->>'cardId') from jsonb_array_elements(p_rows) x) then
    raise exception 'duplicate_import_target';
  end if;

  perform public.ensure_vault_owner_v1(p_user_id);
  perform 1 from public.vault_owners where user_id=p_user_id for update;
  if not found then raise exception 'import_owner_unavailable'; end if;

  for r in select value from jsonb_array_elements(p_rows) order by value->>'cardId' loop
    select * into c from public.card_prints where id=(r->>'cardId')::uuid for share;
    if not found or c.gv_id is distinct from r->>'gvId' then
      raise exception 'import_card_identity_mismatch';
    end if;
    desired := (r->>'desiredQuantity')::integer;
    if coalesce(r->>'condition','') not in ('NM','LP','MP','HP','DMG') then
      raise exception 'invalid_import_condition';
    end if;
    select count(*) into owned from public.vault_item_instances i
      left join public.slab_certs s on s.id=i.slab_cert_id
      where i.user_id=p_user_id and i.archived_at is null
        and coalesce(i.card_print_id,s.card_print_id)=c.id;
    delta := greatest(desired-owned,0);
    if delta>0 then
      select id into anchor from public.vault_items
        where user_id=p_user_id and card_id=c.id and archived_at is null
        order by created_at desc nulls last,id desc limit 1 for update;
      if not found then
        insert into public.vault_items(user_id,card_id,gv_id,qty,condition_label,acquisition_cost,created_at,notes,name,set_name)
          values(p_user_id,c.id,c.gv_id,delta,r->>'condition',(r->>'acquisitionCost')::numeric,
            coalesce((r->>'createdAt')::timestamptz,now()),r->>'notes',c.name,
            (select name from public.sets where id=c.set_id)) returning id into anchor;
      end if;
      for copy_index in 1..delta loop
        perform public.admin_vault_instance_create_v1(p_user_id=>p_user_id,p_card_print_id=>c.id,
          p_legacy_vault_item_id=>anchor,p_condition_label=>r->>'condition',
          p_acquisition_cost=>(r->>'acquisitionCost')::numeric,p_created_at=>(r->>'createdAt')::timestamptz,
          p_notes=>r->>'notes',p_name=>c.name,p_set_name=>(select name from public.sets where id=c.set_id));
      end loop;
      -- Mirror only this anchor's active copies. Other exact-copy anchors remain intact.
      update public.vault_items set qty=(select count(*) from public.vault_item_instances
        where user_id=p_user_id and legacy_vault_item_id=anchor and archived_at is null)
        where id=anchor and user_id=p_user_id;
      added := added+delta;
      entries := entries+1;
    end if;
    targets := targets || jsonb_build_array(jsonb_build_object('cardPrintId',c.id,'expectedCount',owned+delta));
  end loop;
  return jsonb_build_object('importedCards',added,'importedEntries',entries,'targets',targets);
end;
$$;
revoke all on function public.admin_import_vault_targets_v1(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.admin_import_vault_targets_v1(uuid,jsonb) to service_role;
commit;
