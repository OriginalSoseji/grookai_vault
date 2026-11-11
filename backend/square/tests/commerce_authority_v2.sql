-- Match modern PostgREST service authentication. A scalar role GUC would hide
-- an invalid dependency on the legacy resolver's session-sensitive boundary.
set local request.jwt.claim.role='';
set local request.jwt.claims='{"role":"service_role"}';
do $proof$
declare c grookai_square.connections; t grookai_square.targets; context jsonb; lease uuid:=gen_random_uuid();
 op jsonb; payload jsonb; source jsonb; sale_id uuid; observed jsonb; first_result jsonb; again jsonb; active_before integer; copy public.vault_item_instances;
begin
 select * into strict c from grookai_square.connections where merchant_id='runtime-merchant';
 select * into strict t from grookai_square.targets where connection_id=c.id order by id limit 1;
 select v.* into strict copy from public.vault_item_instances v where v.id=t.instance_id;
 copy:=public.admin_vault_instance_create_v1(p_user_id=>c.owner_id,p_card_print_id=>copy.card_print_id,p_card_printing_id=>copy.card_printing_id,
  p_legacy_vault_item_id=>copy.legacy_vault_item_id,p_name=>'LOCAL Square rollback proof',p_condition_label=>'NM');
 update public.vault_item_instances set intent='sell',pricing_mode='asking',asking_price_amount=20,asking_price_currency='USD' where id=copy.id;
 insert into grookai_square.targets(connection_id,owner_id,instance_id,item_id,variation_id)
  values(c.id,c.owner_id,copy.id,'fixture-item-'||replace(gen_random_uuid()::text,'-',''),'fixture-variation-'||replace(gen_random_uuid()::text,'-','')) returning * into t;
 select count(*) into active_before from public.vault_item_instances where user_id=c.owner_id and archived_at is null;
 perform public.square_controls_set_v1((select revision from grookai_square.controls where singleton),true,true,array[c.owner_id]);
 perform public.square_commerce_controls_set_v2((select revision from grookai_square.commerce_controls where singleton),true,array[c.owner_id]);
 perform public.square_commerce_service_v2('preferences',jsonb_build_object('ownerId',c.owner_id,'connectionId',c.id,'confirmed',true,'autoEnroll',true,'sellOnSquare',true));
 c:=jsonb_populate_record(null::grookai_square.connections,public.square_service_v1('claim',jsonb_build_object('ownerId',c.owner_id,'connectionId',c.id,'leaseToken',lease)));
 context:=jsonb_build_object('ownerId',c.owner_id,'connectionId',c.id,'leaseToken',lease,'fence',c.lease_fence,'targetId',t.id);
 source:=grookai_square.offer(c.owner_id,t.instance_id);
 if source is null then raise exception 'PROOF_OFFER_MISSING: %',public.vendor_store_copy_reason_v1(c.owner_id,t.instance_id); end if;
 payload:=jsonb_build_object('idempotency_key',gen_random_uuid(),'changes',jsonb_build_array(jsonb_build_object('type','PHYSICAL_COUNT',
  'physical_count',jsonb_build_object('catalog_object_id',t.variation_id,'location_id',c.location_id,'state','IN_STOCK','quantity','1','occurred_at',clock_timestamp()))));
 op:=public.square_commerce_service_v2('stock_prepare',context||jsonb_build_object('kind','allocate','payload',payload,'sourceSnapshot',source));
 if not grookai_square.copy_claimed(t.instance_id) then raise exception 'PROOF_NO_DURABLE_CLAIM'; end if;
 begin update grookai_square.stock_operations set payload='{}' where id=(op->>'id')::uuid;
  raise exception 'PROOF_PAYLOAD_MUTABLE'; exception when raise_exception then if sqlerrm<>'square_stock_request_immutable' then raise; end if; end;
 perform public.square_commerce_service_v2('commerce_targets',context);
 perform public.square_commerce_service_v2('order_variations',context||jsonb_build_object('variationIds',jsonb_build_array(t.variation_id)));
 perform public.square_commerce_health_v2('sandbox');
 begin update public.vault_item_instances set archived_at=now() where id=t.instance_id;
  raise exception 'PROOF_RESERVED_ARCHIVE_ACCEPTED'; exception when sqlstate '55000' then null; end;
 begin insert into public.vendor_stock_reservations(instance_id,quantity) values(t.instance_id,1);
  raise exception 'PROOF_COMPETING_WEB_CLAIM_ACCEPTED'; exception when sqlstate '55000' then null; end;
 begin insert into public.ebay_seller_reservations_v1(instance_id,user_id,draft_id,publication_operation_id)
  values(t.instance_id,c.owner_id,gen_random_uuid(),gen_random_uuid());
  raise exception 'PROOF_COMPETING_EBAY_CLAIM_ACCEPTED'; exception when sqlstate '55000' then null; end;
 perform public.square_commerce_service_v2('stock_begin',context||jsonb_build_object('operationId',op->>'id'));
 perform public.square_commerce_service_v2('stock_finish',context||jsonb_build_object('operationId',op->>'id','quantity',1));
 if not exists(select 1 from grookai_square.allocations where target_id=t.id and state='active') then raise exception 'PROOF_NOT_ACTIVE'; end if;
 observed:=jsonb_build_object('id','local-proof-order','locationId',c.location_id,'currency','USD','state','pending','lines',jsonb_build_array(
  jsonb_build_object('id','local-proof-line','variationId',t.variation_id,'quantity','1','saleCents',1234,'taxCents',100)));
 perform public.square_commerce_service_v2('order_observe',context||jsonb_build_object('evidence',observed,'evidenceHash',repeat('1',64)));
 if exists(select 1 from public.vault_item_instance_dispositions where vault_item_instance_id=t.instance_id) then raise exception 'PROOF_PENDING_SALE_ARCHIVED'; end if;
 observed:=observed||jsonb_build_object('state','paid','payments',jsonb_build_array(jsonb_build_object('id','old-payment','createdAt','2000-01-01T00:00:00Z')));
 first_result:=public.square_commerce_service_v2('order_observe',context||jsonb_build_object('evidence',observed,'evidenceHash',repeat('4',64)));
 if first_result->>'sales'<>'0' or exists(select 1 from public.vault_item_instance_dispositions where vault_item_instance_id=t.instance_id)
  or not grookai_square.copy_claimed(t.instance_id) then raise exception 'PROOF_HISTORICAL_PAYMENT_CONSUMED_CURRENT_COPY'; end if;
 observed:=observed||jsonb_build_object('payments',jsonb_build_array(jsonb_build_object('id','local-proof-payment','createdAt',clock_timestamp())));
 first_result:=public.square_commerce_service_v2('order_observe',context||jsonb_build_object('evidence',observed,'evidenceHash',repeat('2',64)));
 again:=public.square_commerce_service_v2('order_observe',context||jsonb_build_object('evidence',observed,'evidenceHash',repeat('2',64)));
 if first_result<>again or first_result->>'sales'<>'1' or grookai_square.copy_claimed(t.instance_id)
  or (select count(*) from public.vault_item_instance_dispositions where vault_item_instance_id=t.instance_id)<>1
  or not exists(select 1 from public.vault_item_instances where id=t.instance_id and archived_at is not null)
  or (select count(*) from public.vault_item_instances where user_id=c.owner_id and archived_at is null)<>active_before-1
  then raise exception 'PROOF_CANONICAL_SALE_NOT_ATOMIC_OR_IDEMPOTENT'; end if;
 begin update public.vault_item_instances set archived_at=null where id=t.instance_id;
  raise exception 'PROOF_SOLD_COPY_REACTIVATED'; exception when sqlstate '55000' then null; end;
 select id into strict sale_id from grookai_square.sales where connection_id=c.id and order_id='local-proof-order';
 perform public.square_commerce_service_v2('refund_observe',context||jsonb_build_object('evidenceHash',repeat('3',64),'evidence',jsonb_build_object(
  'id','local-proof-refund','orderId','local-proof-order','locationId',c.location_id,'currency','USD','status','COMPLETED','amountCents',1334)));
 if exists(select 1 from public.vault_item_instances where id=t.instance_id and archived_at is null) then raise exception 'PROOF_REFUND_RESTORED_OLD_COPY'; end if;
 first_result:=public.square_commerce_service_v2('return',context||jsonb_build_object('saleId',sale_id,'confirmed',true));
 again:=public.square_commerce_service_v2('return',context||jsonb_build_object('saleId',sale_id,'confirmed',true));
 if first_result->>'instanceId' is distinct from again->>'instanceId' or first_result->>'instanceId'=t.instance_id::text or nullif(first_result->>'gvvi','') is null
  or (select count(*) from public.vault_item_instances where user_id=c.owner_id and archived_at is null)<>active_before then
  raise exception 'PROOF_RETURN_NOT_DISTINCT_OR_REPEATED'; end if;
 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('grookai_inventory','grookai_square')
  and (has_function_privilege('authenticated',p.oid,'EXECUTE') or has_function_privilege('anon',p.oid,'EXECUTE') or has_function_privilege('service_role',p.oid,'EXECUTE')))
  then raise exception 'PROOF_PRIVATE_CORE_EXPOSED'; end if;
 if has_function_privilege('authenticated','public.square_commerce_service_v2(text,jsonb)','EXECUTE')
  or has_function_privilege('anon','public.square_signal_record_v2(text,text,text,text,text,text)','EXECUTE') then raise exception 'PROOF_SERVICE_RPC_EXPOSED'; end if;
end $proof$;
select json_build_object('pass',true,'competingClaimsRejected',true,'pendingPaymentPreserved',true,'canonicalSaleOnce',true,'refundDoesNotRestore',true,'confirmedReturnOnce',true,'privateAuthorityDenied',true,'productionWrites',0);
