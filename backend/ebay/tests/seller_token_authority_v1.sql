set local request.jwt.claim.role = 'service_role';
set local request.jwt.claim.sub = 'eb000000-0000-4000-8000-000000000001';
do $token_proof$
declare
  actor uuid := 'eb000000-0000-4000-8000-000000000001';
  other_actor uuid := 'eb000000-0000-4000-8000-000000000002';
  account_id uuid; first_nonce uuid:=gen_random_uuid(); second_nonce uuid:=gen_random_uuid();
  late_nonce uuid:=gen_random_uuid(); result jsonb; claimed jsonb; attempt jsonb;
  scopes text[]:=array['https://api.ebay.com/oauth/api_scope',
    'https://api.ebay.com/oauth/api_scope/sell.inventory',
    'https://api.ebay.com/oauth/api_scope/sell.account.readonly',
    'https://api.ebay.com/oauth/api_scope/commerce.identity.readonly'];
begin
  select id into strict account_id from public.ebay_accounts where user_id=actor;
  result:=public.ebay_seller_token_claim_v1(actor,account_id,first_nonce);
  if result->>'status'<>'ready' or result->>'accessToken'<>repeat('x',40) then
    raise exception 'PROOF_VALID_TOKEN_NOT_REUSED';
  end if;
  begin
    perform public.ebay_seller_token_claim_v1(other_actor,account_id,first_nonce);
    raise exception 'PROOF_OTHER_OWNER_TOKEN_ACCESS';
  exception when sqlstate '42501' then null; end;
  -- Advance only the synthetic fixture's expiry, rather than sleeping an hour.
  update public.ebay_accounts set access_token_expires_at=clock_timestamp()-interval '1 second' where id=account_id;
  claimed:=public.ebay_seller_token_claim_v1(actor,account_id,first_nonce);
  if claimed->>'status'<>'refresh_claimed' then raise exception 'PROOF_REFRESH_NOT_CLAIMED'; end if;
  result:=public.ebay_seller_token_claim_v1(actor,account_id,second_nonce);
  if result->>'status'<>'refresh_in_progress' or result ? 'refreshToken' then
    raise exception 'PROOF_REFRESH_CLAIM_NOT_EXCLUSIVE';
  end if;
  result:=public.ebay_seller_token_complete_v1(actor,account_id,second_nonce,
    (claimed->>'revision')::bigint,repeat('z',40),clock_timestamp()+interval '1 hour');
  if result->>'status'<>'superseded' then raise exception 'PROOF_WRONG_REFRESH_NONCE_ACCEPTED'; end if;
  result:=public.ebay_seller_token_complete_v1(actor,account_id,first_nonce,
    (claimed->>'revision')::bigint,repeat('z',40),clock_timestamp()+interval '1 hour');
  if result->>'status'<>'ready' or public.ebay_seller_token_fail_v1(actor,account_id,first_nonce,
      (claimed->>'revision')::bigint,true,'provider_result_uncertain') then
    raise exception 'PROOF_COMPLETED_REFRESH_OVERWRITTEN';
  end if;
  if (select status from public.ebay_seller_token_refreshes_v1 where claim_nonce=first_nonce)<>'succeeded' then
    raise exception 'PROOF_REFRESH_SUCCESS_NOT_DURABLE';
  end if;
  update public.ebay_accounts set access_token_expires_at=clock_timestamp()-interval '1 second' where id=account_id;
  claimed:=public.ebay_seller_token_claim_v1(actor,account_id,second_nonce);
  if not public.ebay_seller_token_fail_v1(actor,account_id,second_nonce,
      (claimed->>'revision')::bigint,true,'provider_unavailable') then
    raise exception 'PROOF_REFRESH_FAILURE_NOT_RECORDED';
  end if;
  result:=public.ebay_seller_token_claim_v1(actor,account_id,late_nonce);
  if result->>'status'<>'reconnect_required' or result ? 'accessToken' or result ? 'refreshToken' then
    raise exception 'PROOF_UNCERTAIN_REFRESH_REUSED_CREDENTIALS';
  end if;
  -- A fresh explicit OAuth grant can restore the same immutable seller binding.
  attempt:=public.ebay_seller_oauth_start_v1(actor,repeat('1',64));
  perform public.ebay_seller_oauth_launch_v1(repeat('1',64),repeat('2',64),repeat('3',64));
  perform public.ebay_seller_oauth_claim_v1(repeat('2',64),repeat('3',64),late_nonce,false);
  perform public.ebay_seller_oauth_complete_v1((attempt->>'attemptId')::uuid,late_nonce,
    'fixture-provider-id','fixture-seller',repeat('r',40),repeat('s',40),
    clock_timestamp()+interval '1 hour',scopes,clock_timestamp()+interval '500 days');
  update public.ebay_accounts set access_token_expires_at=clock_timestamp()-interval '1 second' where id=account_id;
  claimed:=public.ebay_seller_token_claim_v1(actor,account_id,late_nonce);
  update public.ebay_accounts set refresh_lease_until=clock_timestamp()-interval '1 second' where id=account_id;
  result:=public.ebay_seller_token_claim_v1(actor,account_id,gen_random_uuid());
  if result->>'status'<>'reconnect_required' then raise exception 'PROOF_EXPIRED_REFRESH_LEASE_REPLAYED'; end if;
  result:=public.ebay_seller_token_complete_v1(actor,account_id,late_nonce,
    (claimed->>'revision')::bigint,repeat('q',40),clock_timestamp()+interval '1 hour');
  if result->>'status'<>'superseded'
      or (select access_token from public.ebay_accounts where id=account_id)<>repeat('r',40) then
    raise exception 'PROOF_LATE_REFRESH_REPLACED_CURRENT_TOKEN';
  end if;
  if (select count(*) from public.ebay_seller_token_refreshes_v1 where status='running')<>0
      or (select count(*) from public.ebay_seller_token_refreshes_v1)<>3 then
    raise exception 'PROOF_REFRESH_TERMINAL_AUDIT_INCOMPLETE';
  end if;
end $token_proof$;
select json_build_object('tokenReuseOwnerClaimsLostAckFailureLeaseAndLateReceiptGuards','passed',
  'providerCalls',0,'productionWrites',0,'diagnosticRollbackRequired',true);
