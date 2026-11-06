-- The executor is private even to direct service-role RPC callers. Only this
-- owner-definer wrapper can call it and persist accepted-request outcomes.
revoke all on function public.vault_intake_execute_v1(uuid,text,jsonb) from public,anon,authenticated,service_role;
revoke all on public.purchase_lots,public.vault_intake_batches,public.vault_intake_items,public.vault_intake_allocation_events from service_role;
grant select on public.purchase_lots,public.vault_intake_batches,public.vault_intake_items,public.vault_intake_allocation_events to service_role;

create or replace function public.vault_intake_request_v1(p_actor_user_id uuid,p_action text,p_payload jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path=public as $function$
declare
  operation_id uuid:=gen_random_uuid();
  started timestamptz:=clock_timestamp();
  stage text:='validate_payload';
  result jsonb;
  code text;
  state text;
  message text;
  subject uuid;
  key text;
  safe_action text:=left(coalesce(nullif(p_action,''),'unknown'),80);
  summary jsonb:='{}';
begin
  if auth.role() is distinct from 'service_role' or p_actor_user_id is null then raise exception 'service_role_and_actor_required' using errcode='42501'; end if;
  perform 1 from auth.users where id=p_actor_user_id for key share;
  if not found then raise exception 'actor_not_found' using errcode='42501'; end if;
  perform set_config('request.jwt.claim.sub',p_actor_user_id::text,true);
  key:=encode(sha256(convert_to('collector_reviewed_intake_v1|'||p_actor_user_id::text||'|'||coalesce(p_action,'')||'|'||coalesce(p_payload::text,'null'),'UTF8')),'hex');
  if coalesce(p_payload->>'id','') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then subject:=(p_payload->>'id')::uuid; end if;
  begin
    if jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'invalid_payload' using errcode='22023'; end if;
    if octet_length(p_payload::text)>4000000 then raise exception 'batch_too_large' using errcode='22023'; end if;
    if p_action is null or char_length(p_action)>80 then raise exception 'unsupported_intake_action' using errcode='22023'; end if;
    stage:='check_controls';
    if p_action in ('lot.save','batch.save','batch.commit','allocation.revise','sale.record') and not public.collector_intake_can_write_v1() then raise exception 'intake_writes_disabled' using errcode='55000'; end if;
    stage:='execute';
    result:=public.vault_intake_execute_v1(p_actor_user_id,p_action,p_payload);
    stage:='persist_success';
    summary:=jsonb_strip_nulls(jsonb_build_object('batch_id',result->'batch'->'id','result_id',case when jsonb_typeof(result)='object' then result->'id' else null end,
      'batch_state',result->'batch'->'state','result_count',case when jsonb_typeof(result)='array' then jsonb_array_length(result) else null end,
      'saved_item_count',case when jsonb_typeof(result->'saved_items')='array' then jsonb_array_length(result->'saved_items') else null end));
  exception when others then
    get stacked diagnostics state=returned_sqlstate,message=message_text;
    code:=case when message ~ '^[a-z][a-z0-9_]{1,79}$' then message else 'intake_request_failed' end;
    result:=null;
  end;
  insert into public.vault_intake_operations_v1(id,user_id,analysis_key,action,subject_id,status,stage,result_summary,error_code,error_detail,started_at,finished_at)
  values(operation_id,p_actor_user_id,key,safe_action,subject,case when code is null then 'succeeded' else 'failed' end,stage,
    case when code is null then summary else '{}'::jsonb end,code,
    case when code is null then '{}'::jsonb else jsonb_build_object('sqlstate',state,'action',safe_action,'stage',stage,'version','collector_reviewed_intake_v1') end,started,clock_timestamp());
  if code is not null then return jsonb_build_object('ok',false,'version',1,'operation_id',operation_id,'error',jsonb_build_object('code',code,'sqlstate',state)); end if;
  return jsonb_build_object('ok',true,'version',1,'operation_id',operation_id,'result',result);
end;
$function$;
revoke all on function public.vault_intake_request_v1(uuid,text,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.vault_intake_request_v1(uuid,text,jsonb) to service_role;

notify pgrst,'reload schema';
