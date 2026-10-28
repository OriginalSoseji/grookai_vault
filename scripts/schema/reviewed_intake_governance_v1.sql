create table if not exists public.collector_intake_controls_v1 (
  singleton boolean primary key default true check (singleton),
  writes_enabled boolean not null default false,
  canary_actor_ids uuid[] not null default '{}',
  revision bigint not null default 1 check (revision>0),
  updated_at timestamptz not null default now(),
  check (cardinality(canary_actor_ids)<=10)
);
insert into public.collector_intake_controls_v1(singleton) values(true) on conflict do nothing;

create table if not exists public.collector_intake_control_events_v1 (
  id uuid primary key default gen_random_uuid(),
  version text not null default 'collector_reviewed_intake_v1',
  status text not null check(status in ('succeeded','failed')),
  previous_state jsonb not null default '{}',
  next_state jsonb not null default '{}',
  error_code text,
  error_detail jsonb not null default '{}',
  created_at timestamptz not null default clock_timestamp()
);
create table if not exists public.vault_intake_operations_v1 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  version text not null default 'collector_reviewed_intake_v1',
  analysis_key text not null check(char_length(analysis_key)=64),
  action text not null check(char_length(action) between 1 and 80),
  subject_id uuid,
  status text not null check(status in ('succeeded','failed')),
  stage text not null,
  result_summary jsonb not null default '{}',
  error_code text,
  error_detail jsonb not null default '{}',
  started_at timestamptz not null,
  finished_at timestamptz not null,
  check ((status='succeeded' and error_code is null) or (status='failed' and error_code is not null))
);
create index if not exists vault_intake_operations_owner_time_idx on public.vault_intake_operations_v1(user_id,finished_at desc,id);
create index if not exists vault_intake_operations_analysis_idx on public.vault_intake_operations_v1(analysis_key,finished_at desc);
alter table public.collector_intake_controls_v1 enable row level security;
alter table public.collector_intake_control_events_v1 enable row level security;
alter table public.vault_intake_operations_v1 enable row level security;
revoke all on public.collector_intake_controls_v1,public.collector_intake_control_events_v1,public.vault_intake_operations_v1 from public,anon,authenticated,service_role;
grant select on public.collector_intake_controls_v1,public.collector_intake_control_events_v1,public.vault_intake_operations_v1 to service_role;

create or replace function public.collector_intake_can_write_v1() returns boolean
language sql stable security definer set search_path=public as $function$
  select auth.uid() is not null and exists(
    select 1 from public.collector_intake_controls_v1 c where c.singleton
      and (c.writes_enabled or auth.uid()=any(c.canary_actor_ids))
  );
$function$;
revoke all on function public.collector_intake_can_write_v1() from public,anon,authenticated,service_role;
grant execute on function public.collector_intake_can_write_v1() to authenticated,service_role;

create or replace function public.collector_intake_set_control_v1(p_expected_revision bigint,p_enabled boolean,p_canary_actor_ids uuid[] default '{}') returns jsonb
language plpgsql security definer set search_path=public as $function$
declare
  previous public.collector_intake_controls_v1%rowtype;
  next_row public.collector_intake_controls_v1%rowtype;
  actors uuid[];
  code text;
  state text;
  message text;
  event_id uuid:=gen_random_uuid();
begin
  if auth.role() is distinct from 'service_role' then raise exception 'service_role_required' using errcode='42501'; end if;
  begin
    if p_enabled is null or p_canary_actor_ids is null or cardinality(p_canary_actor_ids)>10 or array_position(p_canary_actor_ids,null) is not null then raise exception 'invalid_intake_control'; end if;
    select coalesce(array_agg(id order by id),'{}'::uuid[]) into actors from (select distinct unnest(p_canary_actor_ids) id) a;
    if (select count(*) from auth.users where id=any(actors))<>cardinality(actors) then raise exception 'invalid_canary_actor'; end if;
    select * into previous from public.collector_intake_controls_v1 where singleton for update;
    if previous.revision is distinct from p_expected_revision then raise exception 'intake_control_revision_conflict' using errcode='40001'; end if;
    update public.collector_intake_controls_v1 set writes_enabled=p_enabled,canary_actor_ids=actors,revision=revision+1,updated_at=clock_timestamp()
      where singleton returning * into next_row;
  exception when others then
    get stacked diagnostics state=returned_sqlstate,message=message_text;
    code:=case when message ~ '^[a-z][a-z0-9_]{1,79}$' then message else 'intake_control_failed' end;
  end;
  insert into public.collector_intake_control_events_v1(id,status,previous_state,next_state,error_code,error_detail)
  values(event_id,case when code is null then 'succeeded' else 'failed' end,coalesce(to_jsonb(previous),'{}'),
    case when code is null then to_jsonb(next_row) else '{}'::jsonb end,code,
    case when code is null then '{}'::jsonb else jsonb_build_object('sqlstate',state,'stage','control_update') end);
  if code is not null then return jsonb_build_object('ok',false,'operation_id',event_id,'error',jsonb_build_object('code',code,'sqlstate',state)); end if;
  return jsonb_build_object('ok',true,'operation_id',event_id,'result',to_jsonb(next_row));
end;
$function$;
revoke all on function public.collector_intake_set_control_v1(bigint,boolean,uuid[]) from public,anon,authenticated,service_role;
grant execute on function public.collector_intake_set_control_v1(bigint,boolean,uuid[]) to service_role;
