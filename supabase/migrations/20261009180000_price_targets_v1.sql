-- Explicit owner targets over qualified raw-printing references. No job/rollout activation.
begin;
create table if not exists public.price_target_control (
 singleton boolean primary key default true check(singleton),
 edit_enabled boolean not null default false,
 evaluate_enabled boolean not null default false
);
insert into public.price_target_control(singleton) values(true) on conflict(singleton) do nothing;
create table if not exists public.price_target_owners(owner_id uuid primary key references auth.users(id) on delete cascade);
create table if not exists public.price_targets (
 id uuid primary key,
 owner_id uuid not null references auth.users(id) on delete cascade,
 printing_id uuid not null references public.card_printings(id) on delete restrict,
 direction text not null check(direction in ('at_or_below','at_or_above')),
 amount numeric not null check(amount>0 and amount::text not in ('NaN','Infinity','-Infinity') and length(amount::text)<=1024),
 currency text not null check(currency='USD'),
 revision bigint not null default 1 check(revision>0),
 enabled boolean not null,
 last_checked_at timestamptz,
 last_observed_at timestamptz,
 last_published_at timestamptz,
 last_provenance_id uuid,
 triggered_at timestamptz,
 reference jsonb,
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 unique(owner_id,id)
);
create index if not exists price_targets_pending_v1 on public.price_targets(last_checked_at nulls first,id) where enabled and triggered_at is null;
create table if not exists public.price_target_requests (
 owner_id uuid not null references auth.users(id) on delete cascade,
 request_id uuid not null,
 payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=8192),
 result jsonb not null,
 created_at timestamptz not null default clock_timestamp(),
 primary key(owner_id,request_id)
);
create table if not exists public.price_target_events (
 target_id uuid not null references public.price_targets(id) on delete cascade,
 revision bigint not null,
 owner_id uuid not null references auth.users(id) on delete cascade,
 outbox_id uuid not null references public.notification_outbox(id) on delete restrict,
 payload jsonb not null,
 created_at timestamptz not null default clock_timestamp(),
 primary key(target_id,revision)
);
alter table public.price_target_control enable row level security;
alter table public.price_target_owners enable row level security;
alter table public.price_targets enable row level security;
alter table public.price_target_requests enable row level security;
alter table public.price_target_events enable row level security;
revoke all on public.price_target_control,public.price_target_owners,public.price_targets,public.price_target_requests,public.price_target_events from public,anon,authenticated,service_role;

create or replace function public.price_targets_read_v1() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid(); result jsonb;
begin
 if actor is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if (select count(*) from public.price_targets where owner_id=actor)>1000 then raise exception 'Price target limit exceeded' using errcode='54000'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'revision',t.revision::text,'printingId',t.printing_id,
   'cardPrintId',p.card_print_id,'name',c.name,'printingGvId',p.printing_gv_id,'finish',p.finish_key,
   'amount',trim_scale(t.amount)::text,'currency',t.currency,'direction',t.direction,'enabled',t.enabled,
   'lastCheckedAt',public.portfolio_history_utc_v1(t.last_checked_at),
   'triggeredAt',public.portfolio_history_utc_v1(t.triggered_at),'reference',t.reference)
   order by t.created_at desc,t.id),'[]') into result
 from public.price_targets t join public.card_printings p on p.id=t.printing_id
 join public.card_prints c on c.id=p.card_print_id where t.owner_id=actor;
 return jsonb_build_object('version',1,'ownerId',actor,'editEnabled',(select edit_enabled from public.price_target_control),'targets',result);
end $$;

create or replace function public.price_targets_save_v1(p jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); v_request_id uuid; target_id uuid; expected bigint; cost numeric;
 prior public.price_target_requests; target public.price_targets; result jsonb; printing uuid;
begin
 if actor is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if not public.vendor_event_fields_valid_v1(p,array['requestId','id','expectedRevision','printingId','direction','amount','currency','enabled'])
  or octet_length(p::text)>8192
  or not public.vendor_event_uuid_valid_v1(p->'requestId') or not public.vendor_event_uuid_valid_v1(p->'id')
  or not public.vendor_event_uuid_valid_v1(p->'printingId')
  or jsonb_typeof(p->'expectedRevision') is distinct from 'string' or coalesce(p->>'expectedRevision','')!~'^(0|[1-9][0-9]{0,18})$'
  or jsonb_typeof(p->'amount') is distinct from 'string' or length(p->>'amount')>1024
  or coalesce(p->>'amount','')!~'^(0|[1-9][0-9]*)(\.[0-9]+)?$'
  or coalesce(p->>'direction','') not in ('at_or_below','at_or_above')
  or p->>'currency' is distinct from 'USD' or jsonb_typeof(p->'enabled') is distinct from 'boolean'
  then raise exception 'Invalid price target' using errcode='22023'; end if;
 v_request_id:=(p->>'requestId')::uuid;target_id:=(p->>'id')::uuid;printing:=(p->>'printingId')::uuid;
 expected:=(p->>'expectedRevision')::bigint;cost:=(p->>'amount')::numeric;
 if cost<=0 then raise exception 'Invalid price target amount' using errcode='22023'; end if;
 insert into public.price_target_owners(owner_id) values(actor) on conflict do nothing;
 perform 1 from public.price_target_owners where owner_id=actor for update;
 select * into prior from public.price_target_requests r where r.owner_id=actor and r.request_id=v_request_id;
 if found then
  if prior.payload is distinct from p then raise exception 'Price target request changed' using errcode='PT409'; end if;
  return prior.result;
 end if;
 if not exists(select 1 from public.price_target_control where edit_enabled) then raise exception 'Price targets unavailable' using errcode='42501'; end if;
 perform 1 from public.price_target_control where edit_enabled for share;
 if not found then raise exception 'Price targets unavailable' using errcode='42501'; end if;
 if not exists(select 1 from public.card_printings where id=printing and not is_provisional) then raise exception 'Printing unavailable' using errcode='22023'; end if;
 select * into target from public.price_targets where id=target_id for update;
 if found then
  if target.owner_id<>actor then raise exception 'Price target unavailable' using errcode='42501'; end if;
  if target.revision<>expected or target.revision=9223372036854775807 then raise exception 'Price target changed' using errcode='PT409'; end if;
 else
  if expected<>0 then raise exception 'Price target changed' using errcode='PT409'; end if;
  if (select count(*) from public.price_targets where owner_id=actor)>=1000 then raise exception 'Price target limit exceeded' using errcode='54000'; end if;
 end if;
 if (p->>'enabled')::boolean and (select count(*) from public.price_targets where owner_id=actor and enabled and id<>target_id)>=100
  then raise exception 'Active price target limit exceeded' using errcode='54000'; end if;
 insert into public.price_targets(id,owner_id,printing_id,direction,amount,currency,enabled)
 values(target_id,actor,printing,p->>'direction',cost,'USD',(p->>'enabled')::boolean)
 on conflict(id) do update set printing_id=excluded.printing_id,direction=excluded.direction,amount=excluded.amount,
  enabled=excluded.enabled,revision=public.price_targets.revision+1,last_checked_at=null,last_observed_at=null,
  last_published_at=null,last_provenance_id=null,triggered_at=null,reference=null,updated_at=clock_timestamp()
  where public.price_targets.owner_id=actor and public.price_targets.revision=expected
 returning * into target;
 if not found then raise exception 'Price target changed' using errcode='PT409'; end if;
 result:=jsonb_build_object('version',1,'ownerId',actor,'id',target.id,'revision',target.revision::text);
 insert into public.price_target_requests(owner_id,request_id,payload,result) values(actor,v_request_id,p,result);
 return result;
end $$;

-- Reapplication after the audit extension refreshes only the private core.
-- Never replace its durable wrapper with the pre-audit evaluator.
do $migration$
declare definition text := $definition$create or replace function public.price_targets_evaluate_v1(p_limit integer default 100) returns jsonb
language plpgsql security definer set search_path='' as $$
declare t public.price_targets; ref jsonb; candidates jsonb; observed timestamptz; published timestamptz;
 at_time timestamptz:=date_trunc('milliseconds',clock_timestamp()); matched boolean; card_id uuid;
 target_key text; event jsonb; outbox uuid; checked integer:=0; triggered integer:=0;
begin
 if p_limit is null or p_limit not between 1 and 100 then raise exception 'Invalid evaluation limit' using errcode='22023'; end if;
 perform 1 from public.price_target_control where evaluate_enabled for share;
 if not found then return jsonb_build_object('enabled',false,'checked',0,'triggered',0); end if;
 for t in select * from public.price_targets where enabled and triggered_at is null
  order by last_checked_at nulls first,id limit p_limit for update skip locked loop
  checked:=checked+1;
  update public.price_targets set last_checked_at=at_time where id=t.id;
  select card_print_id into card_id from public.card_printings where id=t.printing_id and not is_provisional;
  with prices as materialized (
   select * from public.get_market_pricing_read_model_v1(null,array[t.printing_id]) where pricing_scope='card_printing' and card_printing_id=t.printing_id
  ) select jsonb_agg(case when p.card_print_id=card_id and p.status='available' and p.currency='USD'
   and p.source_name='tcgplayer' and p.source_label='TCGPlayer Market' and p.freshness='fresh' and p.is_from_price=false
   and p.market_close>0 and p.market_close::text not in ('NaN','Infinity','-Infinity') and length(p.market_close::text)<=1024
   and p.observed_at<=at_time and p.published_at<=at_time and p.published_at>=p.observed_at
   and p.observed_at>=at_time-interval '36 hours'
   and s.card_print_id=card_id and s.card_printing_id=t.printing_id and s.market_price=p.market_close
   and s.observed_at=p.observed_at and s.published_at=p.published_at
   and s.publication_state='published' and pub.publication_state='published'
   and run.reconciliation_state='reconciled' and run.state in ('published','verified') and cur.singleton
   then jsonb_build_object('amount',trim_scale(p.market_close)::text,'currency','USD',
    'observedAt',public.portfolio_history_utc_v1(p.observed_at),'publishedAt',public.portfolio_history_utc_v1(p.published_at),
    'provenanceId',p.provenance_id,'publicationSetId',s.publication_set_id,'runId',s.run_id) else 'null'::jsonb end)
   into candidates from prices p left join public.market_price_publication_snapshots s on s.provenance_id=p.provenance_id
   left join public.market_price_publication_sets pub on pub.id=s.publication_set_id and pub.run_id=s.run_id
   left join public.market_price_pipeline_runs run on run.id=s.run_id
   left join public.market_price_current_publication cur on cur.publication_set_id=s.publication_set_id and cur.run_id=s.run_id;
  if candidates is null or jsonb_array_length(candidates)<>1 or candidates->0='null'::jsonb then continue; end if;
  ref:=candidates->0;observed:=(ref->>'observedAt')::timestamptz;published:=(ref->>'publishedAt')::timestamptz;
  if t.last_observed_at is not null and (observed<=t.last_observed_at or published<t.last_published_at or (ref->>'provenanceId')::uuid=t.last_provenance_id) then continue; end if;
  matched:=case when t.direction='at_or_below' then (ref->>'amount')::numeric<=t.amount else (ref->>'amount')::numeric>=t.amount end;
  update public.price_targets set last_observed_at=observed,last_published_at=published,
   last_provenance_id=(ref->>'provenanceId')::uuid,reference=ref,triggered_at=case when matched then at_time else null end where id=t.id;
  if not matched then continue; end if;
  target_key:=encode(extensions.digest(convert_to(replace(jsonb_build_array(1,t.id::text,t.owner_id::text,t.revision::text,card_id::text,t.printing_id::text,t.direction,trim_scale(t.amount)::text,t.currency)::text,', ',','),'UTF8'),'sha256'),'hex');
  event:=jsonb_build_object('version',1,'eventType','price_target_reached','dedupeKey','price-target-v1:'||target_key,
   'ownerId',t.owner_id,'alertId',t.id,'revision',t.revision::text,'cardPrintId',card_id,'printingId',t.printing_id,
   'direction',t.direction,'targetAmount',trim_scale(t.amount)::text,'reference',ref);
  insert into public.notification_outbox(recipient_user_id,event_type,tier,card_print_id,payload,dedupe_key)
   values(t.owner_id,'price_target_reached','instant',card_id,event,'price-target-v1:'||target_key) returning id into outbox;
  insert into public.price_target_events(target_id,revision,owner_id,outbox_id,payload) values(t.id,t.revision,t.owner_id,outbox,event);
  triggered:=triggered+1;
 end loop;
 return jsonb_build_object('enabled',true,'checked',checked,'triggered',triggered);
end $$;$definition$;
begin
 if to_regprocedure('public.price_targets_evaluate_core_v1(integer)') is not null then
  definition := replace(definition, 'function public.price_targets_evaluate_v1(', 'function public.price_targets_evaluate_core_v1(');
 end if;
 execute definition;
 if to_regprocedure('public.price_targets_evaluate_core_v1(integer)') is not null then
  revoke all on function public.price_targets_evaluate_core_v1(integer) from public,anon,authenticated,service_role;
 end if;
end $migration$;

create or replace function public.price_target_delivery_allowed_v1(p_outbox uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.price_target_events e join public.price_targets t on t.id=e.target_id and t.owner_id=e.owner_id and t.revision=e.revision
 join public.notification_outbox o on o.id=e.outbox_id and o.recipient_user_id=e.owner_id and o.event_type='price_target_reached' and o.payload=e.payload
 where e.outbox_id=p_outbox and t.enabled and t.triggered_at is not null
 and exists(select 1 from public.price_target_control where evaluate_enabled));
$$;
revoke all on function public.price_targets_read_v1(),public.price_targets_save_v1(jsonb),public.price_targets_evaluate_v1(integer),public.price_target_delivery_allowed_v1(uuid) from public,anon,authenticated,service_role;
grant execute on function public.price_targets_read_v1(),public.price_targets_save_v1(jsonb) to authenticated;
grant execute on function public.price_targets_evaluate_v1(integer),public.price_target_delivery_allowed_v1(uuid) to service_role;
commit;
