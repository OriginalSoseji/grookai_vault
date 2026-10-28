-- Synthetic rollback-only proof. No provider calls or production writes.
set local request.jwt.claim.role = 'service_role';
do $operation_proof$
declare
  actor uuid:='eb000000-0000-4000-8000-000000000001';
  other_actor uuid:='eb000000-0000-4000-8000-000000000002';
  account_id uuid; card_id uuid; printing_id uuid; copy_id uuid:=gen_random_uuid();
  draft_id uuid:=gen_random_uuid(); photo_id uuid:=gen_random_uuid(); request_id uuid:=gen_random_uuid();
  nonce uuid:=gen_random_uuid(); op_id uuid; withdraw_nonce uuid:=gen_random_uuid(); withdraw_op uuid;
  retired_nonce uuid;
  result jsonb; prepared jsonb; quote jsonb; reviewed jsonb; frozen text; hash text; identity jsonb;
begin
  select id into strict account_id from public.ebay_accounts where user_id=actor;
  select id into strict card_id from public.card_prints order by id offset 1 limit 1;
  insert into public.card_printings(card_print_id,finish_key)
    values(card_id,(select key from public.finish_keys where is_active order by sort_order,key limit 1))
    returning id into printing_id;
  insert into public.vault_item_instances(id,user_id,card_print_id,card_printing_id)
    values(copy_id,actor,card_id,printing_id);
  perform public.ebay_seller_save_draft_v1(actor,draft_id,copy_id,account_id,0,'{"title":"Operation proof"}');
  perform public.ebay_seller_register_photo_v1(actor,draft_id,photo_id,1);
  begin
    perform public.ebay_seller_operation_claim_v1(other_actor,draft_id,request_id,'prepare',2,null,nonce);
    raise exception 'PROOF_OTHER_OWNER_OPERATION_ACCEPTED';
  exception when sqlstate '42501' then null; end;
  begin
    perform public.ebay_seller_operation_claim_v1(actor,draft_id,request_id,'prepare',2,null,nonce);
    raise exception 'PROOF_MISSING_PRIVATE_OBJECT_PREPARED';
  exception when sqlstate '22023' then
    if sqlerrm<>'seller_photo_upload_required' then raise; end if;
  end;
  -- Metadata-only Storage fixture inside this rollback diagnostic. Actual SDK
  -- upload/download and RLS are qualified separately, not by this fixture.
  insert into storage.objects(bucket_id,name,owner_id,metadata)
    select 'ebay-listing-private',storage_path,other_actor::text,
      '{"mimetype":"image/jpeg","size":1024}'::jsonb
      from public.ebay_seller_photos_v1 where id=photo_id;
  begin
    perform public.ebay_seller_operation_claim_v1(actor,draft_id,request_id,'prepare',2,null,nonce);
    raise exception 'PROOF_OTHER_OWNER_STORAGE_OBJECT_PREPARED';
  exception when sqlstate '22023' then
    if sqlerrm<>'seller_photo_upload_required' then raise; end if;
  end;
  update storage.objects set owner_id=actor::text,metadata='{"mimetype":"image/jpeg","size":"malformed"}'
    where bucket_id='ebay-listing-private' and name=actor::text||'/'||draft_id::text||'/'||photo_id::text||'.jpg';
  begin
    perform public.ebay_seller_operation_claim_v1(actor,draft_id,request_id,'prepare',2,null,nonce);
    raise exception 'PROOF_INVALID_STORAGE_METADATA_PREPARED';
  exception when sqlstate '22023' then
    if sqlerrm<>'seller_photo_upload_required' then raise; end if;
  end;
  update storage.objects set metadata='{"mimetype":"image/jpeg","size":1024}'
    where bucket_id='ebay-listing-private' and name=actor::text||'/'||draft_id::text||'/'||photo_id::text||'.jpg';
  result:=public.ebay_seller_operation_claim_v1(actor,draft_id,request_id,'prepare',2,null,nonce);
  op_id:=(result->>'operationId')::uuid;
  if result->>'claimGranted'<>'true' then raise exception 'PROOF_OPERATION_NOT_CLAIMED'; end if;
  result:=public.ebay_seller_operation_claim_v1(actor,draft_id,request_id,'prepare',2,null,gen_random_uuid());
  if result->>'claimGranted'<>'false' or result ? 'snapshot' then raise exception 'PROOF_RETRY_RECLAIMED'; end if;
  begin
    perform public.ebay_seller_operation_claim_v1(actor,draft_id,request_id,'publish',2,repeat('a',64),nonce);
    raise exception 'PROOF_REQUEST_REBOUND';
  exception when sqlstate '22023' then null; end;
  begin
    perform public.ebay_seller_operation_checkpoint_v1(actor,op_id,gen_random_uuid(),'claimed','photos_ready','{}');
    raise exception 'PROOF_WRONG_OPERATION_NONCE_ACCEPTED';
  exception when sqlstate '42501' then null; end;
  perform public.ebay_seller_operation_yield_v1(actor,op_id,nonce);
  retired_nonce:=nonce; nonce:=gen_random_uuid();
  begin
    perform public.ebay_seller_operation_resume_v1(other_actor,op_id,nonce);
    raise exception 'PROOF_OTHER_OWNER_RESUMED_OPERATION';
  exception when sqlstate '42501' then null; end;
  result:=public.ebay_seller_operation_resume_v1(actor,op_id,nonce);
  if result->>'claimGranted'<>'true' then raise exception 'PROOF_PREPARATION_NOT_RESUMED'; end if;
  begin
    perform public.ebay_seller_operation_checkpoint_v1(actor,op_id,retired_nonce,'claimed','photos_ready','{}');
    raise exception 'PROOF_RETIRED_WORKER_REGAINED_CLAIM';
  exception when sqlstate '42501' then null; end;
  result:=public.ebay_seller_operation_resume_v1(actor,op_id,gen_random_uuid());
  if result->>'claimGranted'<>'false' then raise exception 'PROOF_PARALLEL_RESUME_CLAIMED'; end if;
  select copy_identity into strict identity from public.ebay_seller_drafts_v1 where id=draft_id;
  prepared:=jsonb_build_object('actorId',actor,'draftId',draft_id,'revision',2,'sellerAccountId',account_id,
    'copyIdentity',identity,'slabEvidence',null,'inventory','{}'::jsonb,
    'offer',jsonb_build_object('sku','gv-'||draft_id::text,'marketplaceId','EBAY_US','format','FIXED_PRICE','availableQuantity',1),
    'photos',jsonb_build_array(jsonb_build_object('id',photo_id,'sha256',repeat('e',64),
      'imageUrl','https://i.ebayimg.com/images/fixture.jpg','expiresAt','2027-01-01T00:00:00Z')));
  frozen:=prepared::text;
  hash:=encode(extensions.digest(convert_to(frozen,'UTF8'),'sha256'),'hex');
  begin
    perform public.ebay_seller_operation_checkpoint_v1(actor,op_id,nonce,'claimed','photos_ready',
      jsonb_build_object('preparationJson',frozen,'preparationHash',hash));
    raise exception 'PROOF_UNHOSTED_PHOTOS_ACCEPTED';
  exception when sqlstate '22023' then null; end;
  -- Synthetic provider receipts, not an assertion of a real EPS upload.
  perform public.ebay_seller_photo_receipt_v1(actor,op_id,nonce,photo_id,'start_upload');
  begin
    perform public.ebay_seller_operation_yield_v1(actor,op_id,nonce);
    raise exception 'PROOF_INFLIGHT_PHOTO_YIELDED';
  exception when sqlstate '55000' then null; end;
  begin
    perform public.ebay_seller_photo_receipt_v1(actor,op_id,nonce,photo_id,'start_upload');
    raise exception 'PROOF_PHOTO_UPLOAD_REPEATED';
  exception when sqlstate '55000' then null; end;
  perform public.ebay_seller_photo_receipt_v1(actor,op_id,nonce,photo_id,'uploaded',
    jsonb_build_object('imageId','fixture-image','sourceSha256',repeat('e',64)));
  begin
    perform public.ebay_seller_photo_receipt_v1(actor,op_id,nonce,photo_id,'hosted',
      '{"imageId":"different-image","imageUrl":"https://i.ebayimg.com/images/fixture.jpg","expiresAt":"2027-01-01T00:00:00Z"}');
    raise exception 'PROOF_PHOTO_IDENTITY_REBOUND';
  exception when sqlstate '22023' then null; end;
  perform public.ebay_seller_photo_receipt_v1(actor,op_id,nonce,photo_id,'hosted',
    '{"imageId":"fixture-image","imageUrl":"https://i.ebayimg.com/images/fixture.jpg","expiresAt":"2027-01-01T00:00:00Z"}');
  perform public.ebay_seller_operation_checkpoint_v1(actor,op_id,nonce,'claimed','photos_ready',
    jsonb_build_object('preparationJson',frozen,'preparationHash',hash));
  perform public.ebay_seller_operation_checkpoint_v1(actor,op_id,nonce,'photos_ready','inventory_started');
  begin
    perform public.ebay_seller_operation_checkpoint_v1(actor,op_id,nonce,'inventory_started','fees_started');
    raise exception 'PROOF_OPERATION_STAGE_SKIPPED';
  exception when sqlstate '22023' then null; end;
  perform public.ebay_seller_operation_checkpoint_v1(actor,op_id,nonce,'inventory_started','inventory_written');
  perform public.ebay_seller_operation_checkpoint_v1(actor,op_id,nonce,'inventory_written','offer_started');
  perform public.ebay_seller_operation_checkpoint_v1(actor,op_id,nonce,'offer_started','offer_created','{"offerId":"fixture-offer"}');
  perform public.ebay_seller_operation_checkpoint_v1(actor,op_id,nonce,'offer_created','fees_started');
  quote:=jsonb_build_object('offerId','fixture-offer','requestedAt',floor(extract(epoch from clock_timestamp())*1000));
  reviewed:=prepared||jsonb_build_object('offerId','fixture-offer','feeQuote',quote);
  frozen:=reviewed::text; hash:=encode(extensions.digest(convert_to(frozen,'UTF8'),'sha256'),'hex');
  begin
    perform public.ebay_seller_operation_complete_v1(actor,op_id,nonce,
      jsonb_build_object('reviewHash',repeat('f',64),'feeQuote',quote),frozen);
    raise exception 'PROOF_WRONG_REVIEW_HASH_ACCEPTED';
  exception when sqlstate '22023' then null; end;
  result:=public.ebay_seller_operation_complete_v1(actor,op_id,nonce,
    jsonb_build_object('reviewHash',hash,'feeQuote',quote),frozen);
  if result->>'state'<>'prepared' then raise exception 'PROOF_PREPARATION_NOT_SAVED'; end if;
  perform set_config('request.jwt.claim.sub',actor::text,true);
  result:=public.ebay_seller_draft_status_v1(draft_id);
  if result->>'reviewHash'<>hash or result->>'state'<>'prepared'
      or result::text ~ 'claim_nonce|launch_hash|refreshToken|accessToken|lease_until' then
    raise exception 'PROOF_SAFE_DRAFT_PROJECTION'; end if;
  perform set_config('request.jwt.claim.sub',other_actor::text,true);
  begin
    perform public.ebay_seller_draft_status_v1(draft_id);
    raise exception 'PROOF_OTHER_OWNER_DRAFT_STATUS';
  exception when sqlstate '42501' then null; end;
  perform set_config('request.jwt.claim.sub',actor::text,true);
  result:=public.ebay_seller_operation_fail_v1(actor,op_id,nonce,true,'provider_result_uncertain');
  if result->>'status'<>'succeeded' then raise exception 'PROOF_LOST_ACK_OVERWROTE_SUCCESS'; end if;
  begin
    perform public.ebay_seller_operation_claim_v1(actor,draft_id,gen_random_uuid(),'publish',2,hash,nonce);
    raise exception 'PROOF_PAUSED_PUBLICATION_ACCEPTED';
  exception when sqlstate '55000' then null; end;
  perform public.ebay_seller_set_control_v1((select revision from public.ebay_seller_controls_v1),true,true,true,array[actor]);
  result:=public.ebay_seller_operation_claim_v1(actor,draft_id,gen_random_uuid(),'publish',2,hash,nonce);
  op_id:=(result->>'operationId')::uuid;
  result:=public.ebay_seller_operation_fail_v1(actor,op_id,nonce,false,'seller_authorization_required');
  if result->>'status'<>'failed' or exists(select 1 from public.ebay_seller_reservations_v1
      where instance_id=copy_id and released_at is null)
      or (select state from public.ebay_seller_drafts_v1 where id=draft_id)<>'prepared'
      or not exists(select 1 from public.ebay_seller_reservations_v1 where publication_operation_id=op_id
        and release_evidence->>'kind'='no_publish_intent') then
    raise exception 'PROOF_PRECALL_FAILURE_DID_NOT_PRESERVE_REVIEW_AND_EVIDENCE'; end if;
  begin
    perform public.ebay_seller_operation_claim_v1(actor,draft_id,gen_random_uuid(),'publish',2,repeat('f',64),nonce);
    raise exception 'PROOF_STALE_REVIEW_ACCEPTED';
  exception when sqlstate '40001' then null; end;
  request_id:=gen_random_uuid(); nonce:=gen_random_uuid();
  result:=public.ebay_seller_operation_claim_v1(actor,draft_id,request_id,'publish',2,hash,nonce);
  op_id:=(result->>'operationId')::uuid;
  if (select count(*) from public.ebay_seller_reservations_v1 where instance_id=copy_id and released_at is null)<>1 then
    raise exception 'PROOF_PUBLICATION_NOT_RESERVED';
  end if;
  begin
    perform public.ebay_seller_draft_action_v1(actor,draft_id,gen_random_uuid(),2,'abandon');
    raise exception 'PROOF_RESERVED_DRAFT_ABANDONED';
  exception when sqlstate '55000' then null; end;
  begin
    perform public.ebay_seller_operation_complete_v1(actor,op_id,nonce,'{"offerId":"fixture-offer","listingId":"fixture-listing"}');
    raise exception 'PROOF_PUBLISH_WITHOUT_INTENT_ACCEPTED';
  exception when sqlstate '22023' then null; end;
  perform public.ebay_seller_operation_checkpoint_v1(actor,op_id,nonce,'claimed','publish_started');
  update public.ebay_seller_operations_v1 set lease_until=clock_timestamp()-interval '1 second' where id=op_id;
  result:=public.ebay_seller_operation_complete_v1(actor,op_id,nonce,'{"offerId":"fixture-offer","listingId":"fixture-listing"}');
  if result->>'status'<>'uncertain' or not exists(select 1 from public.ebay_seller_reservations_v1
      where instance_id=copy_id and released_at is null) then raise exception 'PROOF_EXPIRED_PUBLISH_RELEASED_COPY'; end if;
  result:=public.ebay_seller_operation_claim_v1(actor,draft_id,request_id,'publish',2,hash,gen_random_uuid());
  if result->>'claimGranted'<>'false' then raise exception 'PROOF_UNCERTAIN_PUBLISH_RECLAIMED'; end if;
  -- Recover identity with an observation; observation alone cannot release.
  nonce:=gen_random_uuid();
  result:=public.ebay_seller_operation_claim_v1(actor,draft_id,gen_random_uuid(),'reconcile',2,null,nonce);
  op_id:=(result->>'operationId')::uuid;
  perform public.ebay_seller_operation_checkpoint_v1(actor,op_id,nonce,'claimed','observing');
  perform public.ebay_seller_operation_complete_v1(actor,op_id,nonce,
    jsonb_build_object('sku','gv-'||draft_id::text,'offerId','fixture-offer',
      'listingId','fixture-listing','state','ended','releasesReservation',false));
  if not exists(select 1 from public.ebay_seller_reservations_v1 where instance_id=copy_id and released_at is null) then
    raise exception 'PROOF_OBSERVATION_RELEASED_COPY'; end if;
  -- Withdrawal remains available when new publication is paused.
  perform public.ebay_seller_set_control_v1((select revision from public.ebay_seller_controls_v1),false,false,false,'{}');
  result:=public.ebay_seller_operation_claim_v1(actor,draft_id,gen_random_uuid(),'withdraw',2,null,withdraw_nonce);
  withdraw_op:=(result->>'operationId')::uuid;
  perform public.ebay_seller_operation_checkpoint_v1(actor,withdraw_op,withdraw_nonce,'claimed','withdraw_started');
  begin
    perform public.ebay_seller_operation_complete_v1(actor,withdraw_op,withdraw_nonce,
      '{"offerId":"fixture-offer","listingId":"different-listing","evidence":"withdraw_response"}');
    raise exception 'PROOF_WRONG_WITHDRAWAL_RELEASED_COPY';
  exception when sqlstate '22023' then null; end;
  result:=public.ebay_seller_operation_complete_v1(actor,withdraw_op,withdraw_nonce,
    '{"offerId":"fixture-offer","listingId":"fixture-listing","evidence":"withdraw_response"}');
  if result->>'state'<>'withdrawn' or exists(select 1 from public.ebay_seller_reservations_v1 where instance_id=copy_id and released_at is null)
      or not exists(select 1 from public.ebay_seller_reservations_v1 where instance_id=copy_id and release_operation_id=withdraw_op)
      or (select archived_at from public.vault_item_instances where id=copy_id) is not null then
    raise exception 'PROOF_WITHDRAWAL_TERMINAL_EVIDENCE_OR_INVENTORY'; end if;
  -- Restore synthetic preparation controls for the following draft guard proof.
  perform public.ebay_seller_set_control_v1((select revision from public.ebay_seller_controls_v1),true,true,false,array[actor,other_actor]);
end $operation_proof$;
select json_build_object('operationReviewIdempotencyIntentLeaseReservationAndWithdrawalGuards','passed',
  'providerCalls',0,'productionWrites',0,'diagnosticRollbackRequired',true);
