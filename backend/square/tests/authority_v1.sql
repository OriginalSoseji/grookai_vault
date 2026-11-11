-- Synthetic rows only; rollback all users, controls, catalog and sync records.
begin;
set local statement_timeout='30s';
create function pg_temp.check_square(ok boolean,label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'square_proof_failed: %',label; end if; end $$;
create function pg_temp.reject_square(command text,expected text) returns void language plpgsql as $$
declare reason text;
begin
  begin execute command; exception when others then reason:=sqlerrm; end;
  if reason is null or position(expected in reason)=0 then raise exception 'square_expected_rejection: %, got %',expected,reason; end if;
end $$;
insert into auth.users(id,email) values
  ('ab000000-0000-4000-8000-000000000001','square-owner-a@fixture.invalid'),
  ('ab000000-0000-4000-8000-000000000002','square-owner-b@fixture.invalid');
select pg_temp.reject_square($q$select public.square_service_v1('oauth_start','{"ownerId":"ab000000-0000-4000-8000-000000000001","environment":"sandbox"}')$q$,'square_linking_disabled');
set local role authenticated;
select pg_temp.reject_square($q$select public.square_service_v1('claim','{}')$q$,'permission denied');
select pg_temp.reject_square($q$select * from grookai_square.connections$q$,'permission denied');
select pg_temp.reject_square($q$select public.square_controls_set_v1(0,true,true,'{}')$q$,'permission denied');
reset role;
select public.square_controls_set_v1(0,true,true,array['ab000000-0000-4000-8000-000000000001'::uuid]);
select pg_temp.reject_square($q$select public.square_controls_set_v1(0,true,true,'{}')$q$,'square_controls_conflict');
select pg_temp.reject_square($q$select public.square_service_v1('oauth_start','{"ownerId":"ab000000-0000-4000-8000-000000000002","environment":"sandbox"}')$q$,'square_linking_disabled');

create temporary table square_proof_state(key text primary key,value jsonb);
insert into square_proof_state values('attempt',public.square_service_v1('oauth_start',jsonb_build_object(
  'ownerId','ab000000-0000-4000-8000-000000000001','environment','sandbox',
  'attemptId','ab000000-0000-4000-8000-000000000011','stateHash',repeat('a',64),'launchHash',repeat('b',64),'stateCiphertext','fixture-encrypted-state')));
select public.square_service_v1('oauth_launch',jsonb_build_object('launchHash',repeat('b',64),'browserHash',repeat('c',64)));
select pg_temp.reject_square($q$select public.square_service_v1('oauth_launch',jsonb_build_object('launchHash',repeat('b',64),'browserHash',repeat('d',64)))$q$,'square_oauth_expired');
select pg_temp.reject_square($q$select public.square_service_v1('oauth_consume',jsonb_build_object('stateHash',repeat('a',64),'browserHash',repeat('d',64)))$q$,'square_oauth_expired');
select public.square_service_v1('oauth_consume',jsonb_build_object('stateHash',repeat('a',64),'browserHash',repeat('c',64)));
select pg_temp.reject_square($q$select public.square_service_v1('oauth_consume',jsonb_build_object('stateHash',repeat('a',64),'browserHash',repeat('c',64)))$q$,'square_oauth_expired');
select public.square_service_v1('oauth_finish','{"attemptId":"ab000000-0000-4000-8000-000000000011","merchantId":"fixture-merchant","tokenCiphertext":"fixture-encrypted-tokens"}');
select pg_temp.reject_square($q$select public.square_service_v1('oauth_finish','{"attemptId":"ab000000-0000-4000-8000-000000000011","merchantId":"fixture-merchant","tokenCiphertext":"duplicate"}')$q$,'square_oauth_not_pending');

insert into square_proof_state select 'claim',public.square_service_v1('claim',jsonb_build_object(
  'ownerId','ab000000-0000-4000-8000-000000000001','connectionId',value->>'connection_id',
  'leaseToken','ab000000-0000-4000-8000-000000000021')) from square_proof_state where key='attempt';
select pg_temp.reject_square($q$select public.square_service_v1('claim',jsonb_build_object('ownerId','ab000000-0000-4000-8000-000000000002',
  'connectionId',(select value->>'id' from square_proof_state where key='claim'),'leaseToken','ab000000-0000-4000-8000-000000000022'))$q$,'square_connection_not_owned');
select pg_temp.reject_square($q$select public.square_service_v1('claim',jsonb_build_object('ownerId','ab000000-0000-4000-8000-000000000001',
  'connectionId',(select value->>'id' from square_proof_state where key='claim'),'leaseToken','ab000000-0000-4000-8000-000000000022'))$q$,'square_connection_busy');
insert into square_proof_state select 'context',jsonb_build_object('ownerId','ab000000-0000-4000-8000-000000000001',
  'connectionId',value->>'id','leaseToken',value->>'lease_token','fence',(value->>'lease_fence')::bigint) from square_proof_state where key='claim';
select public.square_service_v1('configure',value||'{"locationId":"fixture-location","autoSync":true}'::jsonb) from square_proof_state where key='context';
select pg_temp.reject_square($q$select public.square_service_v1('target',(select value from square_proof_state where key='context')||'{"fence":0,"targetId":"ab000000-0000-4000-8000-000000000099"}'::jsonb)$q$,'square_stale_lease');

-- A real current public-printing fixture, not a mocked eligibility function.
do $$
declare card uuid; printing uuid; legacy uuid:=gen_random_uuid(); copy uuid:=gen_random_uuid();
begin
  select id into strict card from public.card_prints order by id limit 1;
  insert into public.card_printings(card_print_id,finish_key,printing_gv_id) values(card,'normal','GV-PK-SQUARE-FIXTURE-NORMAL') returning id into printing;
  insert into public.public_profiles(user_id,slug,display_name,public_profile_enabled,vault_sharing_enabled)
    values('ab000000-0000-4000-8000-000000000001','square-proof-owner','Square proof',true,true)
    on conflict(user_id) do update set public_profile_enabled=true,vault_sharing_enabled=true,slug='square-proof-owner',display_name='Square proof';
  insert into public.user_entitlements(user_id,tier,role,features) values('ab000000-0000-4000-8000-000000000001','vendor','vendor','{"vendor_tools":true}');
  insert into public.vault_items(id,user_id,card_id,name,gv_id,qty) select legacy,'ab000000-0000-4000-8000-000000000001',id,name,gv_id,1 from public.card_prints where id=card;
  insert into public.vault_item_instances(id,user_id,card_print_id,card_printing_id,legacy_vault_item_id,gv_vi_id,intent,pricing_mode,asking_price_amount,asking_price_currency,condition_label)
    values(copy,'ab000000-0000-4000-8000-000000000001',card,printing,legacy,'GVVI-AB000000-000101','sell','asking',20,'USD','NM');
  perform pg_temp.check_square(grookai_square.offer('ab000000-0000-4000-8000-000000000001',copy) is not null,
    coalesce(public.vendor_store_copy_reason_v1('ab000000-0000-4000-8000-000000000001',copy),'offer denied'));
  insert into square_proof_state values('copy',jsonb_build_object('id',copy));
end $$;
select public.square_service_v1('select',(select value from square_proof_state where key='context')||jsonb_build_object('confirmed',true,
  'instanceIds',jsonb_build_array((select value->>'id' from square_proof_state where key='copy'))));
insert into square_proof_state select 'target',to_jsonb(t) from grookai_square.targets t;
update square_proof_state set value=value||jsonb_build_object('targetId',(select value->>'id' from square_proof_state where key='target')) where key='context';
insert into square_proof_state select 'read',public.square_service_v1('target',value) from square_proof_state where key='context';
select pg_temp.check_square((select value->'offer'->>'askingPriceAmount'='20.00' from square_proof_state where key='read'),'exact money DTO');
insert into square_proof_state select 'operation',public.square_service_v1('prepare',value||jsonb_build_object(
  'requestId','ab000000-0000-4000-8000-000000000031','payload','{"idempotency_key":"fixture-key","object":{"type":"ITEM"}}'::jsonb,
  'projection','{"name":"fixture"}'::jsonb,'sourceSnapshot',(select value->'offer' from square_proof_state where key='read')))
  from square_proof_state where key='context';
update square_proof_state set value=value||jsonb_build_object('operationId',(select value->>'id' from square_proof_state where key='operation')) where key='context';
select public.square_service_v1('begin',value) from square_proof_state where key='context';
select public.square_service_v1('fail',value||'{"uncertain":true,"errorCode":"square_provider_unavailable"}'::jsonb) from square_proof_state where key='context';
select public.square_service_v1('deselect',value||jsonb_build_object('instanceIds',jsonb_build_array((select value->>'id' from square_proof_state where key='copy')))) from square_proof_state where key='context';
select pg_temp.reject_square($q$select public.square_service_v1('begin',(select value from square_proof_state where key='context'))$q$,'square_copy_changed');
select pg_temp.reject_square($q$select public.square_service_v1('recover_finish',(select value from square_proof_state where key='context')||'{"itemId":"item","variationId":"variation","observedProjection":{"name":"wrong"}}'::jsonb)$q$,'square_invalid_receipt');
select public.square_service_v1('recover_finish',value||'{"itemId":"item","variationId":"variation","observedProjection":{"name":"fixture"}}'::jsonb) from square_proof_state where key='context';
select pg_temp.check_square((select count(*)=1 from grookai_square.operations where status='succeeded'),'one terminal operation');
select pg_temp.check_square((select last_synced_projection='{"name":"fixture"}'::jsonb from grookai_square.targets),'mapped read recovery');
-- Eligibility must fail after privacy is withdrawn, even when the copy is priced.
update public.public_profiles set vault_sharing_enabled=false where user_id='ab000000-0000-4000-8000-000000000001';
select pg_temp.check_square(grookai_square.offer('ab000000-0000-4000-8000-000000000001',(select (value->>'id')::uuid from square_proof_state where key='copy')) is null,'private copy excluded');

set local request.jwt.claim.sub='ab000000-0000-4000-8000-000000000001';
set local role authenticated;
select pg_temp.check_square(jsonb_array_length(public.square_workspace_v1()->'connections')=1,'owner connection read');
select pg_temp.check_square(public.square_workspace_v1()::text !~ 'token_ciphertext|state_ciphertext|lease_token|fixture-encrypted','safe projection');
set local request.jwt.claim.sub='ab000000-0000-4000-8000-000000000002';
select pg_temp.check_square(public.square_workspace_v1()->'connections'='[]'::jsonb,'other owner isolated');
reset role;
select 'square_authority_proof_passed_rolled_back' result;
rollback;
