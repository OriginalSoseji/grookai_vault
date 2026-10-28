create or replace function pg_temp.intake_ok(value jsonb,label text) returns jsonb language plpgsql as $test$
begin
  if (value->>'ok')::boolean is distinct from true then raise exception 'intake test % failed: %',label,value; end if;
  return value->'result';
end;
$test$;

do $tests$
declare
  actor uuid:=gen_random_uuid();
  peer uuid:=gen_random_uuid();
  card uuid;
  lot_id uuid:=gen_random_uuid();
  batch_id uuid:=gen_random_uuid();
  item_id uuid:=gen_random_uuid();
  missing_id uuid:=gen_random_uuid();
  null_id uuid:=gen_random_uuid();
  bad_state_id uuid:=gen_random_uuid();
  failed_batch uuid:=gen_random_uuid();
  sale_request uuid:=gen_random_uuid();
  payload jsonb;
  row jsonb;
  lot jsonb;
  saved jsonb;
  committed jsonb;
  retried jsonb;
  detail jsonb;
  sale jsonb;
  copy_id uuid;
  before_copies bigint;
  bad_money text;
begin
  insert into auth.users(id) values(actor),(peer);
  select id into card from public.card_prints where set_code='pgo' and number='1' limit 1;
  if card is null then raise exception 'local historical canonical fixture missing'; end if;
  perform set_config('request.jwt.claim.role','service_role',true);
  payload:=jsonb_build_object('id',lot_id,'name','Local reviewed intake','purchased_on','2026-10-27','currency','USD','total_cost_cents',10001,'tags',jsonb_build_array('local-intake'));
  row:=public.vault_intake_request_v1(actor,'lot.save',payload);
  if row->>'ok'<>'false' or row->'error'->>'code'<>'intake_writes_disabled' then raise exception 'default-off control failed: %',row; end if;
  if not exists(select 1 from public.vault_intake_operations_v1 where id=(row->>'operation_id')::uuid and status='failed' and error_code='intake_writes_disabled') then raise exception 'disabled failure not recorded'; end if;
  perform pg_temp.intake_ok(public.collector_intake_set_control_v1(1,false,array[actor]),'enable actor canary');
  lot:=pg_temp.intake_ok(public.vault_intake_request_v1(actor,'lot.save',payload),'save lot');
  row:=public.vault_intake_request_v1(peer,'lot.save',payload||jsonb_build_object('id',gen_random_uuid()));
  if row->'error'->>'code'<>'intake_writes_disabled' then raise exception 'canary leaked to peer'; end if;
  row:=public.vault_intake_request_v1(peer,'lot.detail',jsonb_build_object('lot_id',lot_id));
  if row->'error'->>'code'<>'not_found' then raise exception 'peer read owner lot'; end if;
  if pg_temp.intake_ok(public.vault_intake_request_v1(peer,'lots.list','{}'),'peer list')<>'[]'::jsonb then raise exception 'peer list leaked owner lot'; end if;
  payload:=jsonb_build_object('id',batch_id,'lot_id',lot_id,'title','Local partial batch','currency','USD','acquired_on','2026-10-27','tags',jsonb_build_array('local-intake'),
    'snapshot',jsonb_build_object('allocation_reviewed',true,'items',jsonb_build_array(
      jsonb_build_object('id',item_id,'state','confirmed','card_id',card,'name','Local historical card','set_code','pgo','quantity',2,'condition','Unspecified','copy_costs_cents',jsonb_build_array(3000,3001),'allocation',jsonb_build_object('lot_revision',(lot->>'revision')::integer)),
      jsonb_build_object('id',missing_id,'card_id',card,'quantity',1,'copy_costs_cents',jsonb_build_array(1)),
      jsonb_build_object('id',null_id,'state',null,'card_id',card,'quantity',1,'copy_costs_cents',jsonb_build_array(1)),
      jsonb_build_object('id',bad_state_id,'state','unexpected','card_id',card,'quantity',1,'copy_costs_cents',jsonb_build_array(1))
    )));
  saved:=pg_temp.intake_ok(public.vault_intake_request_v1(actor,'batch.save',payload),'save partial batch');
  committed:=pg_temp.intake_ok(public.vault_intake_request_v1(actor,'batch.commit',jsonb_build_object('id',batch_id,'revision',saved->'revision')),'commit confirmed subset');
  if committed->'batch'->>'state'<>'partial' then raise exception 'pending states incorrectly completed'; end if;
  if jsonb_array_length(committed->'saved_items')<>1 or jsonb_array_length(committed->'saved_items'->0->'instance_ids')<>2 then raise exception 'unconfirmed state created copies'; end if;
  if exists(select 1 from public.vault_intake_items where id in(missing_id,null_id,bad_state_id) and saved_at is not null) then raise exception 'unconfirmed membership saved'; end if;
  retried:=pg_temp.intake_ok(public.vault_intake_request_v1(actor,'batch.commit',jsonb_build_object('id',batch_id,'revision',saved->'revision')),'lost partial response retry');
  if retried is distinct from committed then raise exception 'partial retry changed receipt'; end if;
  detail:=pg_temp.intake_ok(public.vault_intake_request_v1(actor,'lot.detail',jsonb_build_object('lot_id',lot_id)),'read lot');
  if jsonb_array_length(detail->'copies')<>2 or (detail->'lot'->>'reserve_cents')::bigint<>4000 then raise exception 'lot cost/reserve mismatch'; end if;
  copy_id:=(committed->'saved_items'->0->'instance_ids'->>0)::uuid;
  perform set_config('request.jwt.claim.role','authenticated',true);
  begin
    update public.vault_item_instances set acquisition_cost=0 where id=copy_id;
    raise exception 'origin guard accepted direct cost rewrite';
  exception when raise_exception then
    if sqlerrm<>'intake_service_required' then raise; end if;
  end;
  perform set_config('request.jwt.claim.role','service_role',true);
  perform pg_temp.intake_ok(public.vault_intake_request_v1(actor,'allocation.revise',jsonb_build_object('instance_id',copy_id,'cost_cents',3500,'reason','Local reviewed adjustment')),'revise basis');
  detail:=pg_temp.intake_ok(public.vault_intake_request_v1(actor,'lot.detail',jsonb_build_object('lot_id',lot_id)),'read revised lot');
  before_copies:=(select count(*) from public.vault_item_instances where user_id=actor);
  payload:=jsonb_build_object('id',failed_batch,'lot_id',lot_id,'title','Local atomic failure','currency','USD','acquired_on','2026-10-27',
    'snapshot',jsonb_build_object('allocation_reviewed',true,'items',jsonb_build_array(
      jsonb_build_object('id','11111111-1111-4111-8111-111111111111','state','confirmed','card_id',card,'quantity',1,'copy_costs_cents',jsonb_build_array(1),'allocation',jsonb_build_object('lot_revision',detail->'lot'->'revision')),
      jsonb_build_object('id','ffffffff-ffff-4fff-8fff-ffffffffffff','state','confirmed','card_id',gen_random_uuid(),'quantity',1,'copy_costs_cents',jsonb_build_array(1),'notes','Sensitive local note must not enter diagnostics','allocation',jsonb_build_object('lot_revision',detail->'lot'->'revision'))
    )));
  saved:=pg_temp.intake_ok(public.vault_intake_request_v1(actor,'batch.save',payload),'save failure batch');
  row:=public.vault_intake_request_v1(actor,'batch.commit',jsonb_build_object('id',failed_batch,'revision',saved->'revision'));
  if row->>'ok'<>'false' then raise exception 'bad second item accepted'; end if;
  if (select count(*) from public.vault_item_instances where user_id=actor)<>before_copies then raise exception 'failed commit left partial copies'; end if;
  if exists(select 1 from public.vault_intake_items v where v.batch_id=failed_batch and v.saved_at is not null) then raise exception 'failed commit saved membership'; end if;
  if not exists(select 1 from public.vault_intake_operations_v1 where id=(row->>'operation_id')::uuid and status='failed' and stage='execute') then raise exception 'inner rollback lost failure record'; end if;
  if exists(select 1 from public.vault_intake_operations_v1 where (error_detail::text||result_summary::text) like '%Sensitive local note%') then raise exception 'diagnostics retained raw notes'; end if;
  row:=public.vault_intake_request_v1(actor,'lots.list',null::jsonb);
  if row->'error'->>'code'<>'invalid_payload' then raise exception 'SQL NULL payload accepted'; end if;
  row:=public.vault_intake_request_v1(actor,'lots.list','null'::jsonb);
  if row->'error'->>'code'<>'invalid_payload' then raise exception 'JSON null payload accepted'; end if;
  foreach bad_money in array array['NaN','Infinity','-1','50.005'] loop
    row:=public.vault_intake_request_v1(actor,'sale.record',jsonb_build_object('request_id',gen_random_uuid(),'instance_id',copy_id,'amount',bad_money,'expenses',0,'currency','USD','sold_on','2026-10-27'));
    if row->'error'->>'code'<>'invalid_sale_amount' then raise exception 'invalid sale amount accepted: %',bad_money; end if;
  end loop;
  foreach bad_money in array array['NaN','Infinity','-1','0.005'] loop
    row:=public.vault_intake_request_v1(actor,'sale.record',jsonb_build_object('request_id',gen_random_uuid(),'instance_id',copy_id,'amount',50,'expenses',bad_money,'currency','USD','sold_on','2026-10-27'));
    if row->'error'->>'code'<>'invalid_sale_expenses' then raise exception 'invalid sale expenses accepted: %',bad_money; end if;
  end loop;
  if exists(select 1 from public.vault_item_instances where id=copy_id and archived_at is not null) then raise exception 'invalid money archived a copy'; end if;
  payload:=jsonb_build_object('request_id',sale_request,'instance_id',copy_id,'amount',50,'expenses',4,'currency','USD','sold_on','2026-10-27','buyer','Local buyer');
  sale:=pg_temp.intake_ok(public.vault_intake_request_v1(actor,'sale.record',payload),'record supplemental sale');
  if (sale->>'selling_expenses_amount')::numeric<>4 then raise exception 'sale fees missing'; end if;
  if pg_temp.intake_ok(public.vault_intake_request_v1(actor,'sale.record',payload),'sale retry') is distinct from sale then raise exception 'sale retry changed receipt'; end if;
  row:=public.vault_intake_request_v1(actor,'sale.record',payload||jsonb_build_object('amount',51));
  if row->'error'->>'code'<>'request_conflict' then raise exception 'sale request reuse accepted'; end if;
  row:=public.vault_intake_request_v1(actor,'allocation.revise',jsonb_build_object('instance_id',copy_id,'cost_cents',1,'reason','not allowed after sale'));
  if row->'error'->>'code'<>'disposed_copy_cost_locked' then raise exception 'disposed basis changed'; end if;
  if (select count(*) from public.vault_intake_sales_v1 where request_id=sale_request)<>1 then raise exception 'sale supplement duplicated'; end if;
  if has_function_privilege('authenticated','public.vault_intake_request_v1(uuid,text,jsonb)','EXECUTE') or has_function_privilege('anon','public.vault_intake_request_v1(uuid,text,jsonb)','EXECUTE') or has_function_privilege('service_role','public.vault_intake_execute_v1(uuid,text,jsonb)','EXECUTE') then raise exception 'privileged RPC grants leaked'; end if;
  if has_table_privilege('authenticated','public.purchase_lots','SELECT') or has_table_privilege('service_role','public.vault_intake_operations_v1','UPDATE') then raise exception 'private/append-only grants leaked'; end if;
end;
$tests$;
select json_build_object('rollback_business_cases','passed','durable_cross_connection_proof','still_required_after_frozen_apply');
