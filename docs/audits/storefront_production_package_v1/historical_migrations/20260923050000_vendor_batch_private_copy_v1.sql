begin;
-- Preserve market-mode null pricing metadata for private copies with no asking price.
create or replace function public.vendor_batch_intake_finish_v1(p_owner uuid,p_store uuid,p_batch uuid,p_item uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.vendor_batch_intake_receipts; v public.vault_item_instances; c public.card_prints;
 anchor uuid; section uuid; front text; back text; reason text;
begin
 perform public.vendor_batch_intake_access_v1(p_owner,p_store);
 select * into r from public.vendor_batch_intake_receipts where owner_id=p_owner and store_id=p_store and batch_id=p_batch and item_id=p_item for update;
 if not found then raise exception 'Submission unavailable' using errcode='42501';end if;
 select * into v from public.vault_item_instances where id=r.instance_id for update;
 if v.user_id is distinct from p_owner then raise exception 'Copy unavailable' using errcode='42501';end if;
 if r.completed_at is not null then return jsonb_build_object('id',v.id,'gvvi',v.gv_vi_id);end if;
 if v.archived_at is null or v.intent<>'hold' or v.legacy_vault_item_id is not null
  or v.card_print_id is distinct from (r.request->>'card_id')::uuid
  or v.card_printing_id is distinct from (r.request->>'printing_id')::uuid
 then raise exception 'Prepared copy changed' using errcode='PT409';end if;
 perform public.vendor_batch_intake_validate_v1(p_owner,r.request);
 front:=p_owner::text||'/vault-instances/'||v.id::text||'/front/current';
 if r.request->>'back_sha256' is not null then back:=p_owner::text||'/vault-instances/'||v.id::text||'/back/current';end if;
 -- The service checks byte hashes and decoding before calling this RPC. Storage
 -- is private; neither an owner RPC nor a caller-provided URL can attach media.
 if not exists(select 1 from storage.objects where bucket_id='user-card-images' and name=front)
  or (back is not null and not exists(select 1 from storage.objects where bucket_id='user-card-images' and name=back))
 then raise exception 'Upload both required scans before finishing' using errcode='22023';end if;
 select * into strict c from public.card_prints where id=v.card_print_id;
 select id into anchor from public.vault_items where user_id=p_owner and card_id=c.id and archived_at is null order by created_at desc,id desc limit 1 for update;
 if anchor is null then
  insert into public.vault_items(user_id,card_id,gv_id,qty,name,condition_label)
   values(p_owner,c.id,c.gv_id,1,c.name,r.request->>'condition') returning id into anchor;
 else update public.vault_items set qty=qty+1 where id=anchor;end if;
 update public.vault_item_instances set archived_at=null,legacy_vault_item_id=anchor,
  condition_label=r.request->>'condition',intent=r.request->>'intent',
  pricing_mode=case when r.request->>'amount'='' then 'market' else 'asking' end,
  asking_price_amount=nullif(r.request->>'amount','')::numeric,asking_price_currency=case when r.request->>'amount'='' then null else r.request->>'currency' end,
  notes=nullif(r.request->>'location',''),image_source='user_photo',image_url=front,
  image_back_source=case when back is null then null else 'user_photo' end,image_back_url=back,image_display_mode='uploaded'
 where id=v.id;
 for section in select distinct value::uuid from jsonb_array_elements_text(r.request->'sections') loop
  insert into public.wall_section_memberships(section_id,vault_item_instance_id) values(section,v.id) on conflict do nothing;
 end loop;
 if (r.request->>'list')::boolean then
  reason:=public.vendor_store_copy_reason_v1(p_owner,v.id);
  if reason is not null then raise exception '%',reason using errcode='22023';end if;
  insert into public.vendor_store_items(store_id,instance_id) values(p_store,v.id);
 end if;
 update public.vendor_batch_intake_receipts set completed_at=now() where owner_id=p_owner and store_id=p_store and batch_id=p_batch and item_id=p_item;
 return jsonb_build_object('id',v.id,'gvvi',v.gv_vi_id);
end; $$;
notify pgrst,'reload schema';
commit;
