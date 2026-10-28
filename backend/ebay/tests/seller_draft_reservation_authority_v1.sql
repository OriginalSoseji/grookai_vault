-- Synthetic local rows only, in the same diagnostic transaction as OAuth proof.
set local request.jwt.claim.role = 'service_role';
set local request.jwt.claim.sub = 'eb000000-0000-4000-8000-000000000001';
do $draft_proof$
declare
  owner_id uuid := 'eb000000-0000-4000-8000-000000000001';
  other_id uuid := 'eb000000-0000-4000-8000-000000000002';
  copy_id uuid := gen_random_uuid(); draft_id uuid := gen_random_uuid(); photo_id uuid := gen_random_uuid();
  card_id uuid; printing_id uuid; account_id uuid; operation_id uuid; reservation_id uuid;
  fixture_draft uuid;
  draft jsonb; photo jsonb; retry jsonb;
begin
  fixture_draft := draft_id;
  select id into strict account_id from public.ebay_accounts where user_id=owner_id;
  select id into strict card_id from public.card_prints order by id limit 1;
  insert into public.card_printings(card_print_id,finish_key)
    values(card_id,(select key from public.finish_keys where is_active order by sort_order,key limit 1))
    returning id into printing_id;
  insert into public.vault_item_instances(id,user_id,card_print_id,card_printing_id)
    values(copy_id,owner_id,card_id,printing_id);
  draft := public.ebay_seller_save_draft_v1(owner_id,draft_id,copy_id,account_id,0,'{"title":"Synthetic exact-copy test"}');
  retry := public.ebay_seller_save_draft_v1(owner_id,draft_id,copy_id,account_id,0,'{"title":"Synthetic exact-copy test"}');
  if draft->>'revision'<>'1' or retry->>'revision'<>'1' or retry->>'recovered'<>'true'
      or (select count(*) from public.ebay_seller_drafts_v1 where instance_id=copy_id)<>1 then
    raise exception 'PROOF_DRAFT_RETRY_DUPLICATED';
  end if;
  begin
    perform public.ebay_seller_save_draft_v1(owner_id,draft_id,copy_id,account_id,0,'{"title":"Stale update"}');
    raise exception 'PROOF_DRAFT_STALE_UPDATE_ACCEPTED';
  exception when sqlstate '40001' then null; end;
  begin
    perform public.ebay_seller_save_draft_v1(other_id,gen_random_uuid(),copy_id,account_id,0,'{}');
    raise exception 'PROOF_OTHER_OWNER_DRAFT_ACCEPTED';
  exception when sqlstate '22023' then null; end;
  photo := public.ebay_seller_register_photo_v1(owner_id,draft_id,photo_id,1);
  retry := public.ebay_seller_register_photo_v1(owner_id,draft_id,photo_id,1);
  if photo->>'revision'<>'2' or retry->>'revision'<>'2'
      or (select count(*) from public.ebay_seller_photos_v1 p where p.draft_id=fixture_draft)<>1 then
    raise exception 'PROOF_PHOTO_RETRY_DUPLICATED';
  end if;
  if not public.ebay_seller_photo_path_authorized_v1(photo->>'path',true)
      or public.ebay_seller_photo_path_authorized_v1(owner_id::text||'/'||draft_id::text||'/'||gen_random_uuid()::text||'.jpg',true) then
    raise exception 'PROOF_UNREGISTERED_PHOTO_AUTHORITY';
  end if;
  perform set_config('request.jwt.claim.sub',other_id::text,true);
  if public.ebay_seller_photo_path_authorized_v1(photo->>'path',false)
      or public.ebay_seller_photo_path_authorized_v1(photo->>'path',true) then
    raise exception 'PROOF_PHOTO_CROSS_OWNER_ACCESS';
  end if;
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  -- Removal is an owner-bound revision change, stable on retry. It cannot
  -- silently replace or resurrect a previously registered photograph.
  declare extra_photo uuid:=gen_random_uuid(); removed jsonb;
  begin
    perform public.ebay_seller_register_photo_v1(owner_id,draft_id,extra_photo,2);
    begin
      perform public.ebay_seller_remove_photo_v1(other_id,draft_id,extra_photo,3);
      raise exception 'PROOF_OTHER_OWNER_PHOTO_REMOVED';
    exception when sqlstate '42501' then null; end;
    begin
      perform public.ebay_seller_remove_photo_v1(owner_id,draft_id,extra_photo,2);
      raise exception 'PROOF_STALE_PHOTO_REMOVAL_ACCEPTED';
    exception when sqlstate '40001' then null; end;
    removed:=public.ebay_seller_remove_photo_v1(owner_id,draft_id,extra_photo,3);
    retry:=public.ebay_seller_remove_photo_v1(owner_id,draft_id,extra_photo,3);
    if removed->>'revision'<>'4' or retry->>'revision'<>'4' or retry->>'recovered'<>'true'
        or (select state from public.ebay_seller_photos_v1 where id=extra_photo)<>'removed' then
      raise exception 'PROOF_PHOTO_REMOVAL_NOT_IDEMPOTENT';
    end if;
  end;
  update public.ebay_seller_drafts_v1 set state='preparing' where id=draft_id;
  begin
    perform public.ebay_seller_remove_photo_v1(owner_id,draft_id,photo_id,4);
    raise exception 'PROOF_PREPARING_PHOTO_REMOVED';
  exception when sqlstate '55000' then null; end;
  if public.ebay_seller_photo_path_authorized_v1(photo->>'path',true)
      or not public.ebay_seller_photo_path_authorized_v1(photo->>'path',false) then
    raise exception 'PROOF_PREPARATION_PHOTO_REPLACEMENT';
  end if;
  update public.ebay_seller_drafts_v1 set state='uncertain' where id=draft_id;
  insert into public.ebay_seller_operations_v1(request_id,draft_id,user_id,account_id,
    kind,expected_revision,lease_until,snapshot)
    values(gen_random_uuid(),draft_id,owner_id,account_id,'publish',2,clock_timestamp()+interval '1 minute','{}')
    returning id into operation_id;
  insert into public.ebay_seller_reservations_v1(draft_id,user_id,instance_id,publication_operation_id)
    values(draft_id,owner_id,copy_id,operation_id) returning id into reservation_id;
  begin
    update public.vault_item_instances set archived_at=clock_timestamp() where id=copy_id;
    raise exception 'PROOF_RESERVED_ARCHIVE_ACCEPTED';
  exception when sqlstate '55000' then null; end;
  begin
    update public.vault_item_instances set condition_label='NM' where id=copy_id;
    raise exception 'PROOF_RESERVED_CONDITION_ACCEPTED';
  exception when sqlstate '55000' then null; end;
  begin
    update public.vault_item_instances set intent='sell' where id=copy_id;
    raise exception 'PROOF_RESERVED_INTENT_ACCEPTED';
  exception when sqlstate '55000' then null; end;
  begin
    insert into public.vault_item_instance_dispositions(user_id,vault_item_instance_id,card_print_id,gv_vi_id,disposition_type)
      values(owner_id,copy_id,card_id,'SYNTHETIC-LOCAL-ONLY','sale');
    raise exception 'PROOF_RESERVED_DISPOSITION_ACCEPTED';
  exception when sqlstate '55000' then null; end;
  begin
    delete from public.vault_item_instances where id=copy_id;
    raise exception 'PROOF_RESERVED_COPY_DELETE_ACCEPTED';
  exception when sqlstate '55000' then null; end;
  begin
    delete from public.ebay_accounts where id=account_id;
    raise exception 'PROOF_RESERVED_ACCOUNT_DELETE_ACCEPTED';
  exception when sqlstate '55000' then null; end;
  begin
    delete from public.ebay_seller_drafts_v1 where id=draft_id;
    raise exception 'PROOF_RESERVED_DRAFT_DELETE_ACCEPTED';
  exception when sqlstate '55000' then null; end;
  begin
    delete from auth.users where id=owner_id;
    raise exception 'PROOF_RESERVED_OWNER_DELETE_ACCEPTED';
  exception when sqlstate '55000' then null; end;
  -- Diagnostic fixture teardown only. Production has no direct service-role
  -- reservation mutation grant; its terminal-evidence operation is separate.
  update public.ebay_seller_reservations_v1 set released_at=clock_timestamp(),
    release_operation_id=operation_id,release_evidence='{"syntheticDiagnosticTeardown":true}' where id=reservation_id;
  -- Verify seller-data cleanup separately from the application's governed
  -- account-deletion orchestrator and retained append-only card-event history.
  delete from public.ebay_accounts where id=account_id;
  if exists(select 1 from public.ebay_seller_drafts_v1 where user_id=owner_id)
      or exists(select 1 from public.ebay_seller_reservations_v1 where user_id=owner_id)
      or exists(select 1 from public.ebay_accounts where user_id=owner_id) then
    raise exception 'PROOF_TERMINAL_SELLER_CLEANUP_FAILED';
  end if;
  if not exists(select 1 from auth.users where id=owner_id)
      or not exists(select 1 from public.vault_item_instances where id=copy_id and archived_at is null) then
    raise exception 'PROOF_SELLER_CLEANUP_CHANGED_INVENTORY_OR_OWNER';
  end if;
end $draft_proof$;
select json_build_object('draftRetryPhotoPrivacyReservationAndDeletionGuards','passed',
  'providerCalls',0,'productionWrites',0,'diagnosticRollbackRequired',true);
