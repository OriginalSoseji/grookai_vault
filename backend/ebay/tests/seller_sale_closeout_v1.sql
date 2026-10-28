-- Real canonical sale writer with synthetic local rows; harness rolls back all.
set local request.jwt.claim.role = 'service_role';
do $sale_proof$
declare actor uuid:='eb000000-0000-4000-8000-000000000001';
  other_actor uuid:='eb000000-0000-4000-8000-000000000002';
  card_id uuid; printing_id uuid; account_id uuid; copy_id uuid:=gen_random_uuid();
  draft_id uuid:=gen_random_uuid(); pub_id uuid; observation_id uuid; request_id uuid:=gen_random_uuid();
  result jsonb; replay jsonb; observation jsonb;
begin
  select id into strict account_id from public.ebay_accounts where user_id=actor;
  select id into strict card_id from public.card_prints order by id offset 2 limit 1;
  insert into public.card_printings(card_print_id,finish_key)
    values(card_id,(select key from public.finish_keys where is_active order by sort_order,key limit 1)) returning id into printing_id;
  select id into strict copy_id from public.admin_vault_instance_create_v1(
    p_user_id=>actor,p_card_print_id=>card_id,p_card_printing_id=>printing_id);
  insert into public.ebay_seller_drafts_v1(id,user_id,instance_id,account_id,state,copy_identity,
    prepared_snapshot,review_hash,prepared_revision,fee_quote,offer_id,listing_id)
    select draft_id,actor,copy_id,account_id,'sale_reported',public.ebay_seller_copy_identity_v1(i),
      '{}',repeat('a',64),1,'{}','fixture-sold-offer','fixture-sold-listing' from public.vault_item_instances i where i.id=copy_id;
  insert into public.ebay_seller_operations_v1(request_id,draft_id,user_id,account_id,kind,status,
    expected_revision,lease_until,stage,snapshot)
    values(gen_random_uuid(),draft_id,actor,account_id,'publish','uncertain',1,
      clock_timestamp()-interval '1 minute','publish_started','{}') returning id into pub_id;
  insert into public.ebay_seller_reservations_v1(draft_id,user_id,instance_id,publication_operation_id)
    values(draft_id,actor,copy_id,pub_id);
  observation:=jsonb_build_object('sku','gv-'||draft_id::text,'offerId','fixture-sold-offer',
    'listingId','fixture-sold-listing','state','sale_reported','providerEnded',true,
    'providerStatus','ENDED','soldQuantity',1,'releasesReservation',false);
  insert into public.ebay_seller_operations_v1(request_id,draft_id,user_id,account_id,kind,status,
    expected_revision,lease_until,stage,snapshot,receipts)
    values(gen_random_uuid(),draft_id,actor,account_id,'reconcile','succeeded',1,clock_timestamp(),'completed','{}',
      jsonb_build_array(jsonb_build_object('stage','completed','evidence',observation))) returning id into observation_id;
  perform set_config('request.jwt.claim.role','authenticated',true);
  perform set_config('request.jwt.claim.sub',actor::text,true);
  begin
    perform public.vault_record_exact_instance_disposition_v2(copy_id,'sale',12.34,'USD');
    raise exception 'PROOF_RESERVED_SALE_BYPASSED_CLOSEOUT';
  exception when sqlstate '55000' then null; end;
  begin
    perform public.ebay_seller_record_sale_v1(draft_id,request_id,1,1234,false);
    raise exception 'PROOF_UNCONFIRMED_SALE_ACCEPTED';
  exception when sqlstate '22023' then null; end;
  begin
    perform public.ebay_seller_record_sale_v1(draft_id,request_id,1,0,true);
    raise exception 'PROOF_INVENTED_ZERO_SALE_ACCEPTED';
  exception when sqlstate '22023' then null; end;
  perform set_config('request.jwt.claim.sub',other_actor::text,true);
  begin
    perform public.ebay_seller_record_sale_v1(draft_id,request_id,1,1234,true);
    raise exception 'PROOF_OTHER_OWNER_SALE_ACCEPTED';
  exception when sqlstate '42501' then null; end;
  perform set_config('request.jwt.claim.sub',actor::text,true);
  update public.ebay_seller_operations_v1 set updated_at=clock_timestamp()-interval '121 seconds' where id=observation_id;
  begin
    perform public.ebay_seller_record_sale_v1(draft_id,request_id,1,1234,true);
    raise exception 'PROOF_STALE_SALE_OBSERVATION_ACCEPTED';
  exception when sqlstate '55000' then null; end;
  if not exists(select 1 from public.ebay_seller_reservations_v1 where instance_id=copy_id and released_at is null)
      or exists(select 1 from public.vault_item_instance_dispositions where vault_item_instance_id=copy_id) then
    raise exception 'PROOF_FAILED_CLOSEOUT_CHANGED_INVENTORY'; end if;
  update public.ebay_seller_operations_v1 set updated_at=clock_timestamp() where id=observation_id;
  result:=public.ebay_seller_record_sale_v1(draft_id,request_id,1,1234,true);
  replay:=public.ebay_seller_record_sale_v1(draft_id,request_id,1,1234,true);
  if result->>'state'<>'sold' or replay->>'recovered'<>'true' or result->'result' is distinct from replay->'result'
      or result#>>'{result,archived_instance_id}'<>copy_id::text
      or (select count(*) from public.vault_item_instance_dispositions where vault_item_instance_id=copy_id)<>1
      or not exists(select 1 from public.vault_item_instance_dispositions where vault_item_instance_id=copy_id
        and sale_price_amount=12.34 and sale_price_currency='USD' and card_print_id=card_id and card_printing_id=printing_id)
      or not exists(select 1 from public.vault_item_instances where id=copy_id and archived_at is not null)
      or exists(select 1 from public.ebay_seller_reservations_v1 where instance_id=copy_id and released_at is null) then
    raise exception 'PROOF_CLOSEOUT_NOT_ATOMIC_OR_DUPLICATED'; end if;
  begin
    perform public.ebay_seller_record_sale_v1(draft_id,request_id,1,9999,true);
    raise exception 'PROOF_SALE_RETRY_CHANGED_AMOUNT';
  exception when sqlstate '22023' then null; end;
  perform set_config('request.jwt.claim.role','service_role',true);
end $sale_proof$;
select json_build_object('ownerConfirmedSaleUsesCanonicalWriterAtomicallyAndReplaysOnce','passed',
  'providerCalls',0,'productionWrites',0,'diagnosticRollbackRequired',true);
