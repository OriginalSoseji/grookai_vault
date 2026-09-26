begin;

-- One immutable request and one allocated GVVI per physical scan item. Preparation
-- creates an archived hold copy; only finalization admits it to active inventory.
create table if not exists public.vendor_batch_intake_control (
 singleton boolean primary key default true check(singleton),
 enabled boolean not null default false
);
insert into public.vendor_batch_intake_control(singleton) values(true) on conflict do nothing;
create table if not exists public.vendor_batch_intake_receipts (
 owner_id uuid not null references auth.users(id) on delete cascade,
 store_id uuid not null references public.vendor_stores(id) on delete restrict,
 batch_id uuid not null,
 item_id uuid not null,
 instance_id uuid not null unique references public.vault_item_instances(id) on delete restrict,
 request jsonb not null check(jsonb_typeof(request)='object'),
 prepared_at timestamptz not null default now(),
 completed_at timestamptz,
 primary key(owner_id,store_id,batch_id,item_id)
);
alter table public.vendor_batch_intake_control enable row level security;
alter table public.vendor_batch_intake_receipts enable row level security;
revoke all on public.vendor_batch_intake_control,public.vendor_batch_intake_receipts from public,anon,authenticated,service_role;
grant select,update on public.vendor_batch_intake_control to service_role;
grant select on public.vendor_batch_intake_receipts to authenticated,service_role;
drop policy if exists vendor_batch_intake_owner_read on public.vendor_batch_intake_receipts;
create policy vendor_batch_intake_owner_read on public.vendor_batch_intake_receipts for select to authenticated
 using(owner_id=auth.uid() and exists(select 1 from public.vendor_stores s where s.id=store_id and s.owner_id=auth.uid()));

create or replace function public.vendor_batch_intake_access_v1(p_owner uuid,p_store uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform public.vendor_stock_require_isolation_v1();
 perform 1 from public.vendor_stores where id=p_store and owner_id=p_owner for update;
 if not found or not exists(select 1 from public.vendor_batch_intake_control where enabled)
  or not exists(select 1 from public.vendor_store_rollout where app_enabled)
  or not coalesce((public.vendor_store_capabilities_v1(p_owner)->>'store_app')::boolean,false)
 then raise exception 'Batch adding unavailable' using errcode='42501';end if;
end; $$;

create or replace function public.vendor_batch_intake_validate_v1(p_owner uuid,p_data jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare c uuid; p uuid; section uuid; amount numeric;
begin
 if p_data is null or jsonb_typeof(p_data)<>'object' or p_data->'version' is distinct from '1'::jsonb
  or jsonb_typeof(p_data->'list') is distinct from 'boolean'
  or not (p_data ?& array['batch_id','item_id','card_id','printing_id','condition','intent','amount','currency','sections','location','front_sha256','back_sha256'])
  or (p_data - array['version','batch_id','item_id','card_id','printing_id','condition','intent','amount','currency','sections','location','list','front_sha256','back_sha256'])<>'{}'::jsonb
 then raise exception 'Invalid batch request' using errcode='22023';end if;
 perform (p_data->>'batch_id')::uuid,(p_data->>'item_id')::uuid;
 c:=(p_data->>'card_id')::uuid;p:=(p_data->>'printing_id')::uuid;
 if c is null or p is null or coalesce(p_data->>'condition','') not in('NM','LP','MP','HP','DMG')
  or coalesce(p_data->>'intent','') not in('hold','sell')
  or jsonb_typeof(p_data->'amount') is distinct from 'string'
  or (p_data->>'amount'<>'' and p_data->>'amount' !~ '^[0-9]{1,8}(\.[0-9]{1,2})?$')
  or coalesce(p_data->>'currency','') !~ '^[A-Z]{3}$'
  or jsonb_typeof(p_data->'location') is distinct from 'string' or length(p_data->>'location')>120
  or jsonb_typeof(p_data->'sections') is distinct from 'array'
  or coalesce(p_data->>'front_sha256','') !~ '^[0-9a-f]{64}$'
  or (p_data->'back_sha256'<>'null'::jsonb and coalesce(p_data->>'back_sha256','') !~ '^[0-9a-f]{64}$')
 then raise exception 'Invalid copy details' using errcode='22023';end if;
 if jsonb_array_length(p_data->'sections')>50 then raise exception 'Too many sections' using errcode='22023';end if;
 amount:=nullif(p_data->>'amount','')::numeric;
 if amount>99999999 or (p_data->>'intent'='sell' and coalesce(amount,0)<=0)
  or ((p_data->>'list')::boolean and p_data->>'intent'<>'sell')
 then raise exception 'Invalid asking price' using errcode='22023';end if;
 if not public.catalog_card_print_visible_to_request_v1(c)
  or not exists(select 1 from public.card_prints cp
   left join public.sets st on st.id=cp.set_id left join public.catalog_set_release_controls sc on sc.set_id=st.id
   left join public.games g on g.id=cp.game_id
   where cp.id=c and nullif(cp.gv_id,'') is not null and case when sc.set_id is not null then sc.release_status='public'
    else lower(coalesce(st.game,g.code,''))='pokemon' or exists(select 1 from public.catalog_game_release_controls gc
     where lower(gc.game_code)=lower(coalesce(st.game,g.code,'')) and gc.release_status='public') end)
  or not exists(select 1 from public.get_public_card_printing_options_v1(array[c],1000,0) o
   where o.id=p and o.card_print_id=c and nullif(o.printing_gv_id,'') is not null)
 then raise exception 'Card or printing is no longer available' using errcode='22023';end if;
 for section in select value::uuid from jsonb_array_elements_text(p_data->'sections') loop
  perform 1 from public.wall_sections where id=section and user_id=p_owner and is_active for share;
  if not found then raise exception 'Section unavailable' using errcode='42501';end if;
 end loop;
 if p_data->>'intent'='sell' and not exists(select 1 from public.public_profiles where user_id=p_owner
  and public_profile_enabled and vault_sharing_enabled and nullif(slug,'') is not null and nullif(display_name,'') is not null)
 then raise exception 'Enable public profile and Vault sharing before adding sale copies' using errcode='22023';end if;
end; $$;

create or replace function public.vendor_batch_intake_prepare_v1(p_owner uuid,p_store uuid,p_data jsonb) returns public.vendor_batch_intake_receipts
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
 if (select count(*) from public.vendor_batch_intake_receipts where owner_id=p_owner and store_id=p_store and batch_id=b)>=50
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
  asking_price_amount=nullif(r.request->>'amount','')::numeric,asking_price_currency=r.request->>'currency',
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
revoke all on function public.vendor_batch_intake_access_v1(uuid,uuid),public.vendor_batch_intake_validate_v1(uuid,jsonb),
 public.vendor_batch_intake_prepare_v1(uuid,uuid,jsonb),public.vendor_batch_intake_finish_v1(uuid,uuid,uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.vendor_batch_intake_prepare_v1(uuid,uuid,jsonb),public.vendor_batch_intake_finish_v1(uuid,uuid,uuid,uuid) to service_role;
notify pgrst,'reload schema';
commit;
