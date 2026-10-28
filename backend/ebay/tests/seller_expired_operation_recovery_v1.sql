-- Uncommitted local fault injection only. The harness always ROLLBACKs.
set local request.jwt.claim.role='service_role';
insert into auth.users(id,email) values
  ('ef810000-0000-4000-8000-000000000001','recovery-owner@qa.invalid'),
  ('ef810000-0000-4000-8000-000000000002','recovery-peer@qa.invalid');
do $expired_recovery_proof$
declare actor uuid:='ef810000-0000-4000-8000-000000000001';
  peer uuid:='ef810000-0000-4000-8000-000000000002';
  account_id uuid; printing_id uuid; card_id uuid; copy_a uuid; copy_b uuid;
  draft_a uuid:=gen_random_uuid(); draft_b uuid:=gen_random_uuid(); draft_c uuid:=gen_random_uuid();
  request_a uuid:=gen_random_uuid(); nonce_a uuid:=gen_random_uuid(); op_a uuid;
  nonce_b uuid:=gen_random_uuid(); op_b uuid; observe_nonce uuid:=gen_random_uuid(); observe_op uuid;
  photo_id uuid:=gen_random_uuid(); revision bigint; result jsonb;
begin
  select c.revision into strict revision from public.ebay_seller_controls_v1 c where singleton;
  perform public.ebay_seller_set_control_v1(revision,true,true,true,array[actor]);
  insert into public.ebay_accounts(user_id,ebay_username,marketplace_id,provider_user_id,environment,
    access_token,refresh_token,access_token_expires_at,refresh_token_expires_at,is_active)
    values(actor,'Local recovery fixture','EBAY_US','LOCAL-RECOVERY-PROOF','production',
      'fixture-access-token-not-real','fixture-refresh-token-not-real',now()+interval '1 hour',now()+interval '1 day',true)
    returning id into account_id;
  select id,card_print_id into strict printing_id,card_id from public.card_printings order by id limit 1;
  select id into strict copy_a from public.admin_vault_instance_create_v1(
    p_user_id=>actor,p_card_print_id=>card_id,p_card_printing_id=>printing_id);
  select id into strict copy_b from public.admin_vault_instance_create_v1(
    p_user_id=>actor,p_card_print_id=>card_id,p_card_printing_id=>printing_id);
  insert into public.ebay_seller_drafts_v1(id,user_id,instance_id,account_id,state,input,copy_identity,
      prepared_snapshot,review_hash,prepared_revision,fee_quote,offer_id)
    select case when i.id=copy_a then draft_a else draft_b end,actor,i.id,account_id,'prepared',
      '{"title":"Local recovery fixture"}',public.ebay_seller_copy_identity_v1(i),
      '{"slabEvidence":null}',repeat('a',64),1,
      jsonb_build_object('requestedAt',extract(epoch from clock_timestamp())*1000),
      case when i.id=copy_a then 'fixture-recovery-offer-a' else 'fixture-recovery-offer-b' end
    from public.vault_item_instances i where i.id in (copy_a,copy_b);
  result:=public.ebay_seller_operation_claim_v1(actor,draft_a,request_a,'publish',1,repeat('a',64),nonce_a);
  op_a:=(result->>'operationId')::uuid;
  perform public.ebay_seller_operation_checkpoint_v1(actor,op_a,nonce_a,'claimed','publish_started');
  begin
    perform public.ebay_seller_operation_claim_v1(actor,draft_a,gen_random_uuid(),'reconcile',1,null,observe_nonce);
    raise exception 'PROOF_NONEXPIRED_WORKER_RETIRED';
  exception when sqlstate '55000' then if sqlerrm<>'seller_operation_in_progress' then raise; end if; end;
  update public.ebay_seller_operations_v1 set lease_until=clock_timestamp()-interval '1 second' where id=op_a;
  begin
    perform public.ebay_seller_operation_claim_v1(peer,draft_a,gen_random_uuid(),'reconcile',1,null,observe_nonce);
    raise exception 'PROOF_PEER_RECOVERED_OWNER_OPERATION';
  exception when sqlstate '42501' then null; end;
  if (select status from public.ebay_seller_operations_v1 where id=op_a)<>'running' then
    raise exception 'PROOF_PEER_RETIRED_OWNER_WORKER'; end if;
  result:=public.ebay_seller_operation_claim_v1(actor,draft_a,gen_random_uuid(),'reconcile',1,null,observe_nonce);
  observe_op:=(result->>'operationId')::uuid;
  if result->>'claimGranted'<>'true'
      or (select status from public.ebay_seller_operations_v1 where id=op_a)<>'uncertain'
      or not exists(select 1 from public.ebay_seller_operations_v1 where id=op_a
        and receipts @> '[{"stage":"lease_expired","evidence":{"reservationPreserved":true}}]')
      or not exists(select 1 from public.ebay_seller_reservations_v1 where draft_id=draft_a and released_at is null) then
    raise exception 'PROOF_EXPIRED_PUBLICATION_NOT_SAFELY_RETIRED'; end if;
  result:=public.ebay_seller_operation_checkpoint_v1(actor,op_a,nonce_a,'publish_started','completed','{}');
  if result->>'status'<>'uncertain' or result->>'advanced'<>'false' then
    raise exception 'PROOF_RETIRED_WORKER_ADVANCED'; end if;
  result:=public.ebay_seller_operation_claim_v1(actor,draft_a,request_a,'publish',1,repeat('a',64),gen_random_uuid());
  if result->>'claimGranted'<>'false' or result->>'status'<>'uncertain' then
    raise exception 'PROOF_EXPIRED_PUBLICATION_RECLAIMED'; end if;
  perform public.ebay_seller_operation_checkpoint_v1(actor,observe_op,observe_nonce,'claimed','observing');
  result:=public.ebay_seller_operation_complete_v1(actor,observe_op,observe_nonce,
    jsonb_build_object('sku','gv-'||draft_a::text,'offerId','fixture-recovery-offer-a',
      'listingId',null,'state','unpublished','releasesReservation',false));
  if result->>'state'<>'uncertain' or not exists(select 1 from public.ebay_seller_reservations_v1
      where draft_id=draft_a and released_at is null) then
    raise exception 'PROOF_UNPUBLISHED_READ_RELEASED_POSSIBLE_LATE_PUBLICATION'; end if;
  observe_nonce:=gen_random_uuid();
  result:=public.ebay_seller_operation_claim_v1(actor,draft_a,gen_random_uuid(),'reconcile',1,null,observe_nonce);
  observe_op:=(result->>'operationId')::uuid;
  perform public.ebay_seller_operation_checkpoint_v1(actor,observe_op,observe_nonce,'claimed','observing');
  result:=public.ebay_seller_operation_complete_v1(actor,observe_op,observe_nonce,
    jsonb_build_object('sku','gv-'||draft_a::text,'offerId','fixture-recovery-offer-a',
      'listingId','fixture-recovery-listing-a','state','active','providerEnded',false,
      'providerStatus','ACTIVE','soldQuantity',0,'releasesReservation',false));
  if result->>'state'<>'live' or not exists(select 1 from public.ebay_seller_reservations_v1
      where draft_id=draft_a and released_at is null) then raise exception 'PROOF_ACTIVE_READ_LOST_HOLD'; end if;
  -- The interrupted operation cannot block every other copy on this account.
  result:=public.ebay_seller_operation_claim_v1(actor,draft_b,gen_random_uuid(),'publish',1,repeat('a',64),nonce_b);
  op_b:=(result->>'operationId')::uuid;
  if result->>'claimGranted'<>'true' then raise exception 'PROOF_ACCOUNT_STILL_BLOCKED'; end if;
  perform public.ebay_seller_operation_fail_v1(actor,op_b,nonce_b,false,'fixture_no_provider_intent');
  -- A known, ended provider receipt can release the original reservation.
  observe_nonce:=gen_random_uuid();
  result:=public.ebay_seller_operation_claim_v1(actor,draft_a,gen_random_uuid(),'reconcile',1,null,observe_nonce);
  observe_op:=(result->>'operationId')::uuid;
  perform public.ebay_seller_operation_checkpoint_v1(actor,observe_op,observe_nonce,'claimed','observing');
  result:=public.ebay_seller_operation_complete_v1(actor,observe_op,observe_nonce,
    jsonb_build_object('sku','gv-'||draft_a::text,'offerId','fixture-recovery-offer-a',
      'listingId','fixture-recovery-listing-a','state','ended','providerEnded',true,
      'providerStatus','ENDED','soldQuantity',0,'releasesReservation',false));
  if result->>'state'<>'ended' or exists(select 1 from public.ebay_seller_reservations_v1
      where draft_id=draft_a and released_at is null) then raise exception 'PROOF_VERIFIED_END_NOT_RELEASED'; end if;
  -- Expired acknowledged handoffs remain resumable; they are not lost workers.
  perform public.ebay_seller_draft_action_v1(actor,draft_b,gen_random_uuid(),1,'edit');
  perform public.ebay_seller_register_photo_v1(actor,draft_b,photo_id,2);
  insert into storage.objects(bucket_id,name,owner_id,metadata) values('ebay-listing-private',
    actor::text||'/'||draft_b::text||'/'||photo_id::text||'.jpg',actor::text,'{"mimetype":"image/jpeg","size":1024}');
  nonce_b:=gen_random_uuid();
  result:=public.ebay_seller_operation_claim_v1(actor,draft_b,gen_random_uuid(),'prepare',3,null,nonce_b);
  op_b:=(result->>'operationId')::uuid;
  perform public.ebay_seller_operation_yield_v1(actor,op_b,nonce_b);
  update public.ebay_seller_operations_v1 set lease_until=clock_timestamp()-interval '1 second' where id=op_b;
  begin
    perform public.ebay_seller_operation_claim_v1(actor,draft_a,gen_random_uuid(),'reconcile',1,null,gen_random_uuid());
    raise exception 'PROOF_SAFE_HANDOFF_RETIRED';
  exception when sqlstate '55000' then if sqlerrm<>'seller_operation_in_progress' then raise; end if; end;
  nonce_b:=gen_random_uuid();
  result:=public.ebay_seller_operation_resume_v1(actor,op_b,nonce_b);
  if result->>'claimGranted'<>'true' then raise exception 'PROOF_SAFE_HANDOFF_NOT_RESUMABLE'; end if;
  perform public.ebay_seller_photo_receipt_v1(actor,op_b,nonce_b,photo_id,'start_upload');
  update public.ebay_seller_operations_v1 set lease_until=clock_timestamp()-interval '1 second' where id=op_b;
  observe_nonce:=gen_random_uuid();
  result:=public.ebay_seller_operation_claim_v1(actor,draft_b,gen_random_uuid(),'reconcile',3,null,observe_nonce);
  observe_op:=(result->>'operationId')::uuid;
  if (select state from public.ebay_seller_photos_v1 where id=photo_id)<>'uncertain'
      or (select status from public.ebay_seller_operations_v1 where id=op_b)<>'uncertain' then
    raise exception 'PROOF_INTERRUPTED_MEDIA_UPLOAD_NOT_RETIRED'; end if;
  perform public.ebay_seller_operation_fail_v1(actor,observe_op,observe_nonce,false,'fixture_observation_unavailable');
  -- A claim that never obtained publish intent is recoverable after a verified
  -- unpublished provider read. Expiry alone still preserves its reservation.
  insert into public.ebay_seller_drafts_v1(id,user_id,instance_id,account_id,state,input,copy_identity,
      prepared_snapshot,review_hash,prepared_revision,fee_quote,offer_id)
    select draft_c,actor,i.id,account_id,'prepared','{"title":"Unstarted claim fixture"}',
      public.ebay_seller_copy_identity_v1(i),'{"slabEvidence":null}',repeat('a',64),1,
      jsonb_build_object('requestedAt',extract(epoch from clock_timestamp())*1000),'fixture-unstarted-offer'
    from public.vault_item_instances i where i.id=copy_a;
  nonce_a:=gen_random_uuid(); request_a:=gen_random_uuid();
  result:=public.ebay_seller_operation_claim_v1(actor,draft_c,request_a,'publish',1,repeat('a',64),nonce_a);
  op_a:=(result->>'operationId')::uuid;
  update public.ebay_seller_operations_v1 set lease_until=clock_timestamp()-interval '1 second' where id=op_a;
  observe_nonce:=gen_random_uuid();
  result:=public.ebay_seller_operation_claim_v1(actor,draft_c,gen_random_uuid(),'reconcile',1,null,observe_nonce);
  observe_op:=(result->>'operationId')::uuid;
  if not exists(select 1 from public.ebay_seller_reservations_v1 where draft_id=draft_c and released_at is null) then
    raise exception 'PROOF_UNSTARTED_CLAIM_RELEASED_BEFORE_READ'; end if;
  perform public.ebay_seller_operation_checkpoint_v1(actor,observe_op,observe_nonce,'claimed','observing');
  result:=public.ebay_seller_operation_complete_v1(actor,observe_op,observe_nonce,
    jsonb_build_object('sku','gv-'||draft_c::text,'offerId','fixture-unstarted-offer',
      'listingId',null,'state','unpublished','releasesReservation',false));
  if result->>'state'<>'prepared' or exists(select 1 from public.ebay_seller_reservations_v1
      where draft_id=draft_c and released_at is null) or not exists(
      select 1 from public.ebay_seller_operations_v1 where id=op_a and status='failed' and stage='claimed'
        and receipts @> '[{"stage":"not_published","evidence":{"kind":"no_publish_intent"}}]') then
    raise exception 'PROOF_UNSTARTED_CLAIM_NOT_RECOVERED_AFTER_READ'; end if;
  -- Replaying an old completed observation cannot release a later publication.
  nonce_b:=gen_random_uuid();
  result:=public.ebay_seller_operation_claim_v1(actor,draft_c,gen_random_uuid(),'publish',1,repeat('a',64),nonce_b);
  op_b:=(result->>'operationId')::uuid;
  result:=public.ebay_seller_operation_complete_v1(actor,observe_op,observe_nonce,
    jsonb_build_object('sku','gv-'||draft_c::text,'offerId','fixture-unstarted-offer',
      'listingId',null,'state','unpublished','releasesReservation',false));
  if result->>'recovered'<>'true' or not exists(select 1 from public.ebay_seller_reservations_v1
      where draft_id=draft_c and publication_operation_id=op_b and released_at is null) then
    raise exception 'PROOF_OBSERVATION_REPLAY_RELEASED_NEW_PUBLICATION'; end if;
  perform public.ebay_seller_operation_fail_v1(actor,op_b,nonce_b,false,'fixture_no_provider_intent');
  perform public.ebay_seller_draft_action_v1(actor,draft_c,gen_random_uuid(),1,'edit');
  if has_function_privilege('authenticated',
      'public.ebay_seller_operation_claim_base480_v1(uuid,uuid,uuid,text,bigint,text,uuid)','execute')
      or has_function_privilege('anon',
      'public.ebay_seller_operation_claim_v1(uuid,uuid,uuid,text,bigint,text,uuid)','execute')
      or has_function_privilege('authenticated',
      'public.ebay_seller_operation_complete_base480_v1(uuid,uuid,uuid,jsonb,text)','execute')
      or has_function_privilege('anon',
      'public.ebay_seller_operation_complete_v1(uuid,uuid,uuid,jsonb,text)','execute') then
    raise exception 'PROOF_RECOVERY_AUTHORITY_EXPOSED'; end if;
end $expired_recovery_proof$;
