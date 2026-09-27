-- Review follow-up. Preserve the applied V1 migration and owner Storage policies.
begin;
drop policy vendor_store_team_media_insert on storage.objects;
create function public.vendor_store_team_upload_budget_v1(p_store uuid) returns void
language plpgsql security definer set search_path='' as $$
declare s public.vendor_stores;
begin
  s:=public.vendor_store_team_access_v1(p_store,'branding');
  if (select count(*) from public.vendor_store_team_events where store_id=s.id
    and action='branding_upload' and created_at>now()-interval '1 hour')>=20
    then raise exception 'Image upload limit reached. Try again later.' using errcode='22023'; end if;
  insert into public.vendor_store_team_events(store_id,actor_id,action,subject_id)
    values(s.id,auth.uid(),'branding_upload',s.id);
end; $$;
revoke all on function public.vendor_store_team_upload_budget_v1(uuid) from public,anon,service_role;
grant execute on function public.vendor_store_team_upload_budget_v1(uuid) to authenticated;
create or replace function public.vendor_store_team_copy_v1(p_store uuid,p_instance uuid,p_action text,p_expected timestamptz,p_data jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare s public.vendor_stores; v public.vault_item_instances; permission text; reason text; amount numeric;
begin
  permission:=case p_action when 'condition' then 'inventory' when 'price' then 'pricing' when 'listing' then 'listings' end;
  if permission is null or jsonb_typeof(p_data) is distinct from 'object' then raise exception 'Invalid inventory action' using errcode='22023'; end if;
  if octet_length(p_data::text)>1024
    or (p_action='condition' and p_data-array['condition']::text[]<>'{}'::jsonb)
    or (p_action='price' and p_data-array['amount','currency']::text[]<>'{}'::jsonb)
    or (p_action='listing' and p_data-array['selected']::text[]<>'{}'::jsonb)
    then raise exception 'Invalid action payload' using errcode='22023'; end if;
  s:=public.vendor_store_team_access_v1(p_store,permission);
  select * into v from public.vault_item_instances where id=p_instance and user_id=s.owner_id and archived_at is null and intent='sell' for update;
  if v.id is null or not exists(select 1 from public.vendor_store_team_copies where store_id=s.id and instance_id=v.id)
    then raise exception 'Copy unavailable' using errcode='42501'; end if;
  if v.updated_at is distinct from p_expected then raise exception 'Copy changed. Reload before saving.' using errcode='PT409'; end if;
  if p_action='condition' then
    if v.slab_cert_id is not null or coalesce(p_data->>'condition','') not in ('NM','LP','MP','HP','DMG') then raise exception 'Invalid condition' using errcode='22023'; end if;
    update public.vault_item_instances set condition_label=p_data->>'condition',updated_at=clock_timestamp() where id=v.id;
  elsif p_action='price' then
    if jsonb_typeof(p_data->'amount') is distinct from 'number' or coalesce(p_data->>'currency','') !~ '^[A-Z]{3}$' then raise exception 'Invalid price' using errcode='22023'; end if;
    amount:=(p_data->>'amount')::numeric;
    if amount<=0 or amount>10000000 or amount<>round(amount,2) then raise exception 'Enter a positive price with at most two decimals' using errcode='22023'; end if;
    update public.vault_item_instances set pricing_mode='asking',asking_price_amount=amount,asking_price_currency=p_data->>'currency',updated_at=clock_timestamp() where id=v.id;
  else
    if jsonb_typeof(p_data->'selected') is distinct from 'boolean' then raise exception 'Choose listing state' using errcode='22023'; end if;
    if (p_data->>'selected')::boolean then
      reason:=public.vendor_store_copy_reason_v1(s.owner_id,v.id);
      if reason is not null then raise exception '%',reason using errcode='22023'; end if;
      insert into public.vendor_store_items(store_id,instance_id) values(s.id,v.id) on conflict do nothing;
    else delete from public.vendor_store_items where store_id=s.id and instance_id=v.id; end if;
    update public.vault_item_instances set updated_at=clock_timestamp() where id=v.id;
  end if;
  insert into public.vendor_store_team_events(store_id,actor_id,action,subject_id,details) values(s.id,auth.uid(),p_action,v.id,p_data);
end; $$;


commit;
