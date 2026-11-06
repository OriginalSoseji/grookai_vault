-- Run inside the candidate migration's uncommitted diagnostic transaction.
-- The harness must ROLLBACK; this is not an apply or an SDK release proof.
set local request.jwt.claim.role = 'service_role';

insert into auth.users(id,email) values
  ('eb000000-0000-4000-8000-000000000001','seller-authority-a@qa.invalid'),
  ('eb000000-0000-4000-8000-000000000002','seller-authority-b@qa.invalid');

do $proof$
declare
  actor_a uuid := 'eb000000-0000-4000-8000-000000000001';
  actor_b uuid := 'eb000000-0000-4000-8000-000000000002';
  claim uuid := gen_random_uuid();
  attempt jsonb; receipt jsonb; result jsonb;
  scopes text[] := array['https://api.ebay.com/oauth/api_scope',
    'https://api.ebay.com/oauth/api_scope/sell.inventory',
    'https://api.ebay.com/oauth/api_scope/sell.account.readonly',
    'https://api.ebay.com/oauth/api_scope/commerce.identity.readonly'];
begin
  begin
    perform public.ebay_seller_oauth_start_v1(actor_a,repeat('a',64));
    raise exception 'PROOF_DISABLED_LINK_ACCEPTED';
  exception when sqlstate '55000' then null; end;
  result := public.ebay_seller_set_control_v1(1,true,true,false,array[actor_a]);
  if result->>'revision'<>'2' then raise exception 'PROOF_CONTROL_REVISION'; end if;
  begin
    perform public.ebay_seller_set_control_v1(1,true,true,false,array[actor_a]);
    raise exception 'PROOF_STALE_CONTROL_ACCEPTED';
  exception when sqlstate '40001' then null; end;
  begin
    perform public.ebay_seller_assert_enabled_v1(actor_a,'publication');
    raise exception 'PROOF_CANARY_BYPASSED_PUBLICATION_PAUSE';
  exception when sqlstate '55000' then null; end;
  begin
    perform public.ebay_seller_oauth_start_v1(actor_b,repeat('b',64));
    raise exception 'PROOF_NONCANARY_LINK_ACCEPTED';
  exception when sqlstate '55000' then null; end;

  attempt := public.ebay_seller_oauth_start_v1(actor_a,repeat('a',64));
  perform public.ebay_seller_oauth_launch_v1(repeat('a',64),repeat('c',64),repeat('d',64));
  begin
    perform public.ebay_seller_oauth_launch_v1(repeat('a',64),repeat('e',64),repeat('f',64));
    raise exception 'PROOF_LAUNCH_REPLAY_ACCEPTED';
  exception when sqlstate '22023' then null; end;
  begin
    perform public.ebay_seller_oauth_claim_v1(repeat('c',64),repeat('f',64),claim,false);
    raise exception 'PROOF_WRONG_BROWSER_ACCEPTED';
  exception when sqlstate '22023' then null; end;
  receipt := public.ebay_seller_oauth_claim_v1(repeat('c',64),repeat('d',64),claim,false);
  if receipt->>'actorId'<>actor_a::text then raise exception 'PROOF_CLAIM_OWNER_CHANGED'; end if;
  begin
    perform public.ebay_seller_oauth_claim_v1(repeat('c',64),repeat('d',64),claim,false);
    raise exception 'PROOF_CALLBACK_REPLAY_ACCEPTED';
  exception when sqlstate '22023' then null; end;
  begin
    perform public.ebay_seller_oauth_start_v1(actor_a,repeat('b',64));
    raise exception 'PROOF_EXCHANGE_SUPERSEDED_WHILE_LIVE';
  exception when sqlstate '55000' then null; end;
  begin
    perform public.ebay_seller_oauth_complete_v1((attempt->>'attemptId')::uuid,
      gen_random_uuid(),'fixture-provider-id','fixture-seller',repeat('x',40),repeat('y',40),
      clock_timestamp()+interval '1 hour',scopes,clock_timestamp()+interval '500 days');
    raise exception 'PROOF_WRONG_COMPLETION_CLAIM_ACCEPTED';
  exception when sqlstate '22023' then null; end;
  result := public.ebay_seller_oauth_complete_v1((attempt->>'attemptId')::uuid,
    claim,'fixture-provider-id','fixture-seller',repeat('x',40),repeat('y',40),
    clock_timestamp()+interval '1 hour',scopes,clock_timestamp()+interval '500 days');
  if result->>'linked'<>'true' then raise exception 'PROOF_LINK_NOT_RECORDED'; end if;
  if public.ebay_seller_oauth_fail_v1((attempt->>'attemptId')::uuid,claim,true,'provider_result_uncertain') then
    raise exception 'PROOF_LOST_ACK_FAILURE_OVERWROTE_LINK';
  end if;
  if (select count(*) from public.ebay_accounts where user_id=actor_a)<>1 then
    raise exception 'PROOF_ACCOUNT_COUNT';
  end if;

  perform public.ebay_seller_set_control_v1(2,true,true,false,array[actor_a,actor_b]);
  attempt := public.ebay_seller_oauth_start_v1(actor_b,repeat('b',64));
  perform public.ebay_seller_oauth_launch_v1(repeat('b',64),repeat('e',64),repeat('f',64));
  receipt := public.ebay_seller_oauth_claim_v1(repeat('e',64),repeat('f',64),claim,false);
  begin
    perform public.ebay_seller_oauth_complete_v1((attempt->>'attemptId')::uuid,
      claim,'fixture-provider-id','fixture-seller',repeat('x',40),repeat('y',40),
      clock_timestamp()+interval '1 hour',scopes,clock_timestamp()+interval '500 days');
    raise exception 'PROOF_SELLER_TRANSFER_ACCEPTED';
  exception when sqlstate '23505' then null; end;
  if not public.ebay_seller_oauth_fail_v1((attempt->>'attemptId')::uuid,claim,false,'seller_binding_conflict') then
    raise exception 'PROOF_FAILURE_NOT_DURABLE';
  end if;
  if (select status from public.ebay_seller_oauth_attempts_v1 where id=(attempt->>'attemptId')::uuid)<>'failed' then
    raise exception 'PROOF_FAILURE_STATUS';
  end if;
  if (select count(*) from public.ebay_seller_control_events_v1)<>2 then
    raise exception 'PROOF_CONTROL_AUDIT_COUNT';
  end if;
end $proof$;

set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'eb000000-0000-4000-8000-000000000001';
set local role authenticated;
do $owner_proof$
declare result jsonb;
begin
  begin
    perform access_token from public.ebay_accounts;
    raise exception 'PROOF_OWNER_READ_TOKEN';
  exception when insufficient_privilege then null; end;
  begin
    perform public.ebay_seller_oauth_start_v1('eb000000-0000-4000-8000-000000000001',repeat('9',64));
    raise exception 'PROOF_OWNER_CALLED_ADMIN_RPC';
  exception when insufficient_privilege then null; end;
  result := public.ebay_seller_account_status_v1();
  if result->>'linked'<>'true' or result->>'username'<>'fixture-seller'
      or result ? 'access_token' or result ? 'refresh_token' or result ? 'provider_user_id' then
    raise exception 'PROOF_OWNER_PROJECTION_INVALID';
  end if;
end $owner_proof$;
set local request.jwt.claim.sub = 'eb000000-0000-4000-8000-000000000002';
do $other_proof$
begin
  if public.ebay_seller_account_status_v1()->>'linked'<>'false' then
    raise exception 'PROOF_OTHER_OWNER_SAW_LINK';
  end if;
end $other_proof$;
reset role;
select json_build_object('oauthAuthorityAssertions',18,'ownerProjectionAssertions',4,
  'status','passed','providerCalls',0,'productionWrites',0,'diagnosticRollbackRequired',true);
