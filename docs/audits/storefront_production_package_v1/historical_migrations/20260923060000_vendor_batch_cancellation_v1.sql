begin;

-- Tombstones also cover a prepare request whose HTTP response was lost or whose
-- transaction has not arrived yet. Old tabs/backups can never revive this item.
create table if not exists public.vendor_batch_intake_cancellations (
 owner_id uuid not null references auth.users(id) on delete cascade,
 store_id uuid not null references public.vendor_stores(id) on delete restrict,
 batch_id uuid not null,
 item_id uuid not null,
 cancelled_at timestamptz not null default now(),
 primary key(owner_id,store_id,batch_id,item_id)
);
alter table public.vendor_batch_intake_cancellations enable row level security;
revoke all on public.vendor_batch_intake_cancellations from public,anon,authenticated,service_role;
grant select on public.vendor_batch_intake_cancellations to authenticated,service_role;
drop policy if exists vendor_batch_cancellation_owner_read on public.vendor_batch_intake_cancellations;
create policy vendor_batch_cancellation_owner_read on public.vendor_batch_intake_cancellations for select to authenticated
 using(owner_id=auth.uid() and exists(select 1 from public.vendor_stores s where s.id=store_id and s.owner_id=auth.uid()));

-- Keep the already-proven allocation and admission bodies byte-for-byte. Only
-- the service entry points gain the serialized cancellation boundary.
do $$ begin
 if to_regprocedure('public.vendor_batch_intake_prepare_base_v1(uuid,uuid,jsonb)') is null then
  alter function public.vendor_batch_intake_prepare_v1(uuid,uuid,jsonb) rename to vendor_batch_intake_prepare_base_v1;
 end if;
 if to_regprocedure('public.vendor_batch_intake_finish_base_v1(uuid,uuid,uuid,uuid)') is null then
  alter function public.vendor_batch_intake_finish_v1(uuid,uuid,uuid,uuid) rename to vendor_batch_intake_finish_base_v1;
 end if;
end $$;
create or replace function public.vendor_batch_intake_prepare_base_v1(p_owner uuid,p_store uuid,p_data jsonb) returns public.vendor_batch_intake_receipts
language plpgsql security definer set search_path='' as $$
declare r public.vendor_batch_intake_receipts; v public.vault_item_instances; c public.card_prints; b uuid; i uuid;
begin
 -- Store lock serializes same-item requests and the 50-copy bound. Server derives owner.
 perform public.vendor_batch_intake_access_v1(p_owner,p_store);
 b:=(p_data->>'batch_id')::uuid;i:=(p_data->>'item_id')::uuid;
 if b is null or i is null then raise exception 'Invalid batch identity' using errcode='22023';end if;
 select * into r from public.vendor_batch_intake_receipts where owner_id=p_owner and store_id=p_store and batch_id=b and item_id=i for update;
 if found then
  if r.request is distinct from p_data then raise exception 'This copy already has a different submission. Resume its saved request.' using errcode='PT409';end if;
  return r;
 end if;
 if (select count(*) from public.vendor_batch_intake_receipts existing_receipt where existing_receipt.owner_id=p_owner and existing_receipt.store_id=p_store and existing_receipt.batch_id=b
  and not exists(select 1 from public.vendor_batch_intake_cancellations x where x.owner_id=existing_receipt.owner_id and x.store_id=existing_receipt.store_id and x.batch_id=existing_receipt.batch_id and x.item_id=existing_receipt.item_id))>=50
 then raise exception 'Batch limit reached' using errcode='22023';end if;
 perform public.vendor_batch_intake_validate_v1(p_owner,p_data);
 select * into strict c from public.card_prints where id=(p_data->>'card_id')::uuid;
 v:=public.admin_vault_instance_create_v1(p_user_id=>p_owner,p_card_print_id=>c.id,
  p_card_printing_id=>(p_data->>'printing_id')::uuid,p_condition_label=>p_data->>'condition',
  p_name=>c.name,p_archived_at=>now());
 insert into public.vendor_batch_intake_receipts(owner_id,store_id,batch_id,item_id,instance_id,request)
 values(p_owner,p_store,b,i,v.id,p_data) returning * into r;
 return r;
end; $$;


revoke all on function public.vendor_batch_intake_prepare_base_v1(uuid,uuid,jsonb),public.vendor_batch_intake_finish_base_v1(uuid,uuid,uuid,uuid) from public,anon,authenticated,service_role;

create or replace function public.vendor_batch_intake_prepare_v1(p_owner uuid,p_store uuid,p_data jsonb)
returns public.vendor_batch_intake_receipts language plpgsql security definer set search_path='' as $$
begin
 perform public.vendor_batch_intake_access_v1(p_owner,p_store);
 if exists(select 1 from public.vendor_batch_intake_cancellations where owner_id=p_owner and store_id=p_store
  and batch_id=(p_data->>'batch_id')::uuid and item_id=(p_data->>'item_id')::uuid)
 then raise exception 'This submission was cancelled. Review a new attempt to add this copy.' using errcode='PT409';end if;
 return public.vendor_batch_intake_prepare_base_v1(p_owner,p_store,p_data);
end $$;

create or replace function public.vendor_batch_intake_finish_v1(p_owner uuid,p_store uuid,p_batch uuid,p_item uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform public.vendor_batch_intake_access_v1(p_owner,p_store);
 if exists(select 1 from public.vendor_batch_intake_cancellations where owner_id=p_owner and store_id=p_store and batch_id=p_batch and item_id=p_item)
 then raise exception 'This submission was cancelled. Review a new attempt to add this copy.' using errcode='PT409';end if;
 return public.vendor_batch_intake_finish_base_v1(p_owner,p_store,p_batch,p_item);
end $$;

create or replace function public.vendor_batch_intake_cancel_v1(p_owner uuid,p_store uuid,p_batch uuid,p_item uuid)
returns jsonb language plpgsql security definer set search_path='' set lock_timeout='5s' as $$
declare r public.vendor_batch_intake_receipts; v public.vault_item_instances; stamp timestamptz;
begin
 perform public.vendor_stock_require_isolation_v1();
 if p_owner is null or p_store is null or p_batch is null or p_item is null then raise exception 'Invalid submission' using errcode='22023';end if;
 -- Owners retain cancellation even after downgrade or rollout suspension.
 perform 1 from public.vendor_stores where id=p_store and owner_id=p_owner for update;
 if not found then raise exception 'Store unavailable' using errcode='42501';end if;
 select * into r from public.vendor_batch_intake_receipts where owner_id=p_owner and store_id=p_store and batch_id=p_batch and item_id=p_item for update;
 if found then
  select * into v from public.vault_item_instances where id=r.instance_id for update;
  if v.user_id is distinct from p_owner then raise exception 'Copy unavailable' using errcode='42501';end if;
  if r.completed_at is not null then
   return jsonb_build_object('cancelled',false,'completed',true,'batch_id',p_batch,'item_id',p_item,'id',v.id,'gvvi',v.gv_vi_id);
  end if;
  if v.archived_at is null or v.intent<>'hold' or v.legacy_vault_item_id is not null
   then raise exception 'Prepared copy changed; cancellation unavailable' using errcode='PT409';end if;
 end if;
 insert into public.vendor_batch_intake_cancellations(owner_id,store_id,batch_id,item_id)
 values(p_owner,p_store,p_batch,p_item) on conflict do nothing;
 select cancelled_at into strict stamp from public.vendor_batch_intake_cancellations where owner_id=p_owner and store_id=p_store and batch_id=p_batch and item_id=p_item;
 return jsonb_build_object('cancelled',true,'completed',false,'batch_id',p_batch,'item_id',p_item,'cancelled_at',stamp);
end $$;
revoke all on function public.vendor_batch_intake_prepare_v1(uuid,uuid,jsonb),public.vendor_batch_intake_finish_v1(uuid,uuid,uuid,uuid),public.vendor_batch_intake_cancel_v1(uuid,uuid,uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.vendor_batch_intake_prepare_v1(uuid,uuid,jsonb),public.vendor_batch_intake_finish_v1(uuid,uuid,uuid,uuid),public.vendor_batch_intake_cancel_v1(uuid,uuid,uuid,uuid) to service_role;
notify pgrst,'reload schema';
commit;
