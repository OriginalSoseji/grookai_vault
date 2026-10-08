-- Private event association and audited operating expenses. No receipt or inventory writer.
begin;

create table if not exists public.vendor_event_control (
  singleton boolean primary key default true check(singleton),
  enabled boolean not null default false
);
insert into public.vendor_event_control(singleton) values(true) on conflict do nothing;
create table if not exists public.vendor_event_owners (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null default 0 check(revision>=0)
);
create table if not exists public.vendor_events (
  owner_id uuid not null references public.vendor_event_owners(owner_id) on delete cascade,
  event_id uuid not null, name text not null, start_date date not null, end_date date not null,
  time_zone text not null, currency text not null check(currency='USD'), notes text not null,
  status text not null default 'open' check(status in ('open','closed')),
  state_reason text not null default '', revision bigint not null check(revision>0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key(owner_id,event_id), check(start_date<=end_date)
);
create table if not exists public.vendor_event_expenses (
  owner_id uuid not null, expense_id uuid not null, event_id uuid not null,
  category text not null check(category in ('booth','travel','lodging','meals','supplies','fees','other')),
  description text not null, amount_minor bigint not null check(amount_minor between 0 and 999999999999),
  currency text not null check(currency='USD'), incurred_on date not null,
  voided boolean not null default false, last_reason text not null default '',
  revision bigint not null check(revision>0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key(owner_id,expense_id),
  foreign key(owner_id,event_id) references public.vendor_events(owner_id,event_id) on delete cascade
);
create table if not exists public.vendor_event_assignments (
  owner_id uuid not null references public.vendor_event_owners(owner_id) on delete cascade,
  receipt_id uuid not null, event_id uuid, revision bigint not null check(revision>0),
  updated_at timestamptz not null default now(), primary key(owner_id,receipt_id),
  foreign key(owner_id,event_id) references public.vendor_events(owner_id,event_id) on delete cascade
);
create table if not exists public.vendor_event_requests (
  owner_id uuid not null references public.vendor_event_owners(owner_id) on delete cascade,
  request_id uuid not null, revision bigint not null check(revision>0),
  request jsonb not null, result jsonb not null, affected_event_ids uuid[] not null,
  before_state jsonb not null, after_state jsonb not null, created_at timestamptz not null default now(),
  primary key(owner_id,request_id), unique(owner_id,revision)
);
create index if not exists vendor_event_expenses_event_idx on public.vendor_event_expenses(owner_id,event_id);
create index if not exists vendor_event_assignments_event_idx on public.vendor_event_assignments(owner_id,event_id);
create index if not exists vendor_event_requests_affected_idx on public.vendor_event_requests using gin(affected_event_ids);
alter table public.vendor_event_control enable row level security;
alter table public.vendor_event_owners enable row level security;
alter table public.vendor_events enable row level security;
alter table public.vendor_event_expenses enable row level security;
alter table public.vendor_event_assignments enable row level security;
alter table public.vendor_event_requests enable row level security;
revoke all on public.vendor_event_control,public.vendor_event_owners,public.vendor_events,
  public.vendor_event_expenses,public.vendor_event_assignments,public.vendor_event_requests
  from public,anon,authenticated,service_role;

create or replace function public.vendor_event_fields_valid_v1(v jsonb, keys text[])
returns boolean language plpgsql immutable set search_path='' as $$
begin
  if jsonb_typeof(v) is distinct from 'object' then return false; end if;
  return v ?& keys and v-keys='{}'::jsonb;
end $$;
create or replace function public.vendor_event_uuid_valid_v1(v jsonb, nullable boolean default false)
returns boolean language sql immutable set search_path='' as $$
  select coalesce((nullable and v='null'::jsonb) or (jsonb_typeof(v)='string'
    and length(v#>>'{}')=36 and (v#>>'{}') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'),false)
$$;
create or replace function public.vendor_event_text_valid_v1(v jsonb, minimum integer, maximum integer, multiline boolean default false)
returns boolean language plpgsql immutable set search_path='' as $$
declare s text;
begin
  if jsonb_typeof(v) is distinct from 'string' then return false; end if;
  s:=v#>>'{}';
  return char_length(s)<=maximum and char_length(btrim(s,U&'\0009\000a\000b\000c\000d\0020\0085\00a0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200a\2028\2029\202f\205f\3000\feff'))>=minimum
    and s !~ U&'[\0001-\0008\000b\000c\000e-\001f\007f]'
    and (multiline or s !~ U&'[\0009\000a\000d\0085\2028\2029]');
end $$;
create or replace function public.vendor_event_decimal_valid_v1(v jsonb, maximum numeric)
returns boolean language plpgsql immutable set search_path='' as $$
declare s text;
begin
  if jsonb_typeof(v) is distinct from 'string' then return false; end if;
  s:=v#>>'{}';
  if length(s) not between 1 and 19 or s ~ '[^0-9]' or (length(s)>1 and left(s,1)='0') then return false; end if;
  return s::numeric<=maximum;
end $$;
create or replace function public.vendor_event_date_valid_v1(v jsonb)
returns boolean language plpgsql immutable set search_path='' as $$
declare s text;
begin
  if jsonb_typeof(v) is distinct from 'string' then return false; end if;
  s:=v#>>'{}';
  if length(s)<>10 or s !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or left(s,4)='0000' then return false; end if;
  perform make_date(substr(s,1,4)::integer,substr(s,6,2)::integer,substr(s,9,2)::integer);
  return true;
exception when datetime_field_overflow or invalid_datetime_format then return false;
end $$;
create or replace function public.vendor_event_request_validate_v1(p jsonb)
returns void language plpgsql immutable set search_path='' as $$
declare v jsonb; r jsonb; kind text; previous text:=''; keys text[]; zone text;
begin
  if not public.vendor_event_fields_valid_v1(p,array['version','requestId','expectedRevision','operation'])
    or octet_length(p::text)>65536 or p->'version' is distinct from '1'::jsonb
    or not public.vendor_event_uuid_valid_v1(p->'requestId')
    or not public.vendor_event_decimal_valid_v1(p->'expectedRevision',9223372036854775807) then
    raise exception 'Invalid event request' using errcode='22023'; end if;
  v:=p->'operation'; kind:=v->>'type';
  if kind in ('event_create','event_update') then
    if not public.vendor_event_fields_valid_v1(v,array['type','eventId','name','startDate','endDate','timeZone','currency','notes'])
      or not public.vendor_event_uuid_valid_v1(v->'eventId') or not public.vendor_event_text_valid_v1(v->'name',1,120)
      or not public.vendor_event_text_valid_v1(v->'notes',0,1000,true)
      or not public.vendor_event_date_valid_v1(v->'startDate') or not public.vendor_event_date_valid_v1(v->'endDate')
      or (v->>'startDate')>(v->>'endDate') or v->'currency' is distinct from '"USD"'::jsonb
      or jsonb_typeof(v->'timeZone') is distinct from 'string' then
      raise exception 'Invalid event details' using errcode='22023'; end if;
    zone:=v->>'timeZone';
    if length(zone) not between 1 and 64 or zone !~ '^[A-Za-z]' or zone ~ '[^A-Za-z0-9_+./-]' or position('..' in zone)>0 then
      raise exception 'Invalid event time zone' using errcode='22023'; end if;
  elsif kind in ('event_close','event_reopen') then
    if not public.vendor_event_fields_valid_v1(v,array['type','eventId','reason']) or not public.vendor_event_uuid_valid_v1(v->'eventId')
      or not public.vendor_event_text_valid_v1(v->'reason',1,240) then raise exception 'Invalid event state request' using errcode='22023'; end if;
  elsif kind in ('expense_create','expense_update') then
    keys:=array['type','eventId','expenseId','category','description','amountMinor','currency','incurredOn'];
    if kind='expense_update' then keys:=keys||array['reason']; end if;
    if not public.vendor_event_fields_valid_v1(v,keys) or not public.vendor_event_uuid_valid_v1(v->'eventId')
      or not public.vendor_event_uuid_valid_v1(v->'expenseId') or coalesce(v->>'category','') not in ('booth','travel','lodging','meals','supplies','fees','other')
      or not public.vendor_event_text_valid_v1(v->'description',1,160) or not public.vendor_event_decimal_valid_v1(v->'amountMinor',999999999999)
      or v->'currency' is distinct from '"USD"'::jsonb or not public.vendor_event_date_valid_v1(v->'incurredOn')
      or (kind='expense_update' and not public.vendor_event_text_valid_v1(v->'reason',1,240)) then
      raise exception 'Invalid event expense' using errcode='22023'; end if;
  elsif kind='expense_void' then
    if not public.vendor_event_fields_valid_v1(v,array['type','eventId','expenseId','reason']) or not public.vendor_event_uuid_valid_v1(v->'eventId')
      or not public.vendor_event_uuid_valid_v1(v->'expenseId') or not public.vendor_event_text_valid_v1(v->'reason',1,240) then
      raise exception 'Invalid expense void request' using errcode='22023'; end if;
  elsif kind='receipts_assign' then
    if not public.vendor_event_fields_valid_v1(v,array['type','eventId','receipts']) or not public.vendor_event_uuid_valid_v1(v->'eventId',true)
      or jsonb_typeof(v->'receipts') is distinct from 'array' then raise exception 'Invalid receipt association' using errcode='22023'; end if;
    if jsonb_array_length(v->'receipts') not between 1 and 100 then raise exception 'Choose between 1 and 100 receipts' using errcode='22023'; end if;
    for r in select value from jsonb_array_elements(v->'receipts') loop
      if not public.vendor_event_fields_valid_v1(r,array['receiptId','previousEventId']) or not public.vendor_event_uuid_valid_v1(r->'receiptId')
        or not public.vendor_event_uuid_valid_v1(r->'previousEventId',true) or (r->>'receiptId')<=previous
        or r->'previousEventId' is not distinct from v->'eventId' then raise exception 'Invalid receipt association' using errcode='22023'; end if;
      previous:=r->>'receiptId';
    end loop;
  else raise exception 'Unsupported event operation' using errcode='22023';
  end if;
end $$;

create or replace function public.vendor_event_mutate_v1(p_request jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  actor uuid:=auth.uid(); rid uuid; expected bigint; current_revision bigint; next_revision bigint;
  prior public.vendor_event_requests%rowtype; v jsonb; kind text; target uuid; expense uuid; receipt uuid;
  event_row public.vendor_events%rowtype; expense_row public.vendor_event_expenses%rowtype;
  assignment_row public.vendor_event_assignments%rowtype; book jsonb; r jsonb; actual_previous uuid;
  before_rows jsonb:='[]'; after_rows jsonb:='[]'; affected uuid[]:='{}'; result jsonb; matching integer;
begin
  if actor is null then raise exception 'Sign in required' using errcode='28000'; end if;
  perform public.vendor_event_request_validate_v1(p_request);
  rid:=(p_request->>'requestId')::uuid; expected:=(p_request->>'expectedRevision')::bigint;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('vendor-event:'||actor::text,0));
  select * into prior from public.vendor_event_requests where owner_id=actor and request_id=rid;
  if found then
    if prior.request is distinct from p_request then raise exception 'Event request changed' using errcode='22023'; end if;
    return prior.result;
  end if;
  if not coalesce((select enabled from public.vendor_event_control where singleton),false)
    or not coalesce((select enabled from public.vendor_receipt_cloud_control where singleton),false) then
    raise exception 'Event entry unavailable' using errcode='42501'; end if;
  insert into public.vendor_event_owners(owner_id) values(actor) on conflict do nothing;
  select revision into current_revision from public.vendor_event_owners where owner_id=actor for update;
  if expected<>current_revision then raise exception 'Events changed; reload before saving' using errcode='PT409'; end if;
  if current_revision=9223372036854775807 then raise exception 'Event revision limit reached' using errcode='22023'; end if;
  next_revision:=current_revision+1; v:=p_request->'operation'; kind:=v->>'type'; target:=(v->>'eventId')::uuid;
  if target is not null then affected:=array[target]; end if;

  if kind in ('event_create','event_update') and not exists(select 1 from pg_catalog.pg_timezone_names where name=v->>'timeZone') then
    raise exception 'Choose a supported event time zone' using errcode='22023'; end if;
  if kind='event_create' then
    if exists(select 1 from public.vendor_events where owner_id=actor and event_id=target) then raise exception 'Event already recorded' using errcode='PT409'; end if;
    if (select count(*) from public.vendor_events where owner_id=actor)>=500 then raise exception 'Event limit reached' using errcode='22023'; end if;
    insert into public.vendor_events(owner_id,event_id,name,start_date,end_date,time_zone,currency,notes,revision)
      values(actor,target,v->>'name',(v->>'startDate')::date,(v->>'endDate')::date,v->>'timeZone','USD',v->>'notes',next_revision)
      returning * into event_row;
    after_rows:=jsonb_build_array(to_jsonb(event_row));
  elsif kind in ('event_update','event_close','event_reopen') then
    select * into event_row from public.vendor_events where owner_id=actor and event_id=target for update;
    if not found then raise exception 'Event unavailable' using errcode='22023'; end if;
    if (kind='event_reopen' and event_row.status<>'closed') or (kind<>'event_reopen' and event_row.status<>'open') then
      raise exception 'Event state changed; review before saving' using errcode='PT409'; end if;
    before_rows:=jsonb_build_array(to_jsonb(event_row));
    if kind='event_update' then
      update public.vendor_events set name=v->>'name',start_date=(v->>'startDate')::date,end_date=(v->>'endDate')::date,
        time_zone=v->>'timeZone',notes=v->>'notes',revision=next_revision,updated_at=now()
        where owner_id=actor and event_id=target returning * into event_row;
    else
      update public.vendor_events set status=case when kind='event_close' then 'closed' else 'open' end,
        state_reason=v->>'reason',revision=next_revision,updated_at=now()
        where owner_id=actor and event_id=target returning * into event_row;
    end if;
    after_rows:=jsonb_build_array(to_jsonb(event_row));
  elsif kind in ('expense_create','expense_update','expense_void') then
    if not exists(select 1 from public.vendor_events where owner_id=actor and event_id=target and status='open') then
      raise exception 'Open event unavailable' using errcode='PT409'; end if;
    expense:=(v->>'expenseId')::uuid;
    select * into expense_row from public.vendor_event_expenses where owner_id=actor and expense_id=expense for update;
    if kind='expense_create' then
      if found then raise exception 'Expense already recorded' using errcode='PT409'; end if;
      if (select count(*) from public.vendor_event_expenses where owner_id=actor and event_id=target)>=1000 then
        raise exception 'Event expense limit reached' using errcode='22023'; end if;
      insert into public.vendor_event_expenses(owner_id,expense_id,event_id,category,description,amount_minor,currency,incurred_on,revision)
        values(actor,expense,target,v->>'category',v->>'description',(v->>'amountMinor')::bigint,'USD',(v->>'incurredOn')::date,next_revision)
        returning * into expense_row;
    else
      if not found or expense_row.event_id is distinct from target or expense_row.voided then raise exception 'Expense unavailable' using errcode='PT409'; end if;
      before_rows:=jsonb_build_array(to_jsonb(expense_row));
      if kind='expense_update' then
        update public.vendor_event_expenses set category=v->>'category',description=v->>'description',amount_minor=(v->>'amountMinor')::bigint,
          incurred_on=(v->>'incurredOn')::date,last_reason=v->>'reason',revision=next_revision,updated_at=now()
          where owner_id=actor and expense_id=expense returning * into expense_row;
      else
        update public.vendor_event_expenses set voided=true,last_reason=v->>'reason',revision=next_revision,updated_at=now()
          where owner_id=actor and expense_id=expense returning * into expense_row;
      end if;
    end if;
    after_rows:=jsonb_build_array(to_jsonb(expense_row));
  elsif kind='receipts_assign' then
    if target is not null and not exists(select 1 from public.vendor_events where owner_id=actor and event_id=target and status='open') then
      raise exception 'Open event unavailable' using errcode='PT409'; end if;
    -- Existing completion/book writers never lock event state. This lock protects
    -- membership and ambiguous legacy aliases while the whole batch is checked.
    select b.book into book from public.vendor_receipt_books b where b.owner_id=actor for update;
    if not found then raise exception 'Receipt unavailable' using errcode='22023'; end if;
    for r in select value from jsonb_array_elements(v->'receipts') loop
      receipt:=(r->>'receiptId')::uuid;
      select count(*) into matching from jsonb_array_elements(book->'receipts') entry where lower(entry->'receipt'->>'id')=receipt::text;
      if matching<>1 then raise exception 'Receipt unavailable or identity needs review' using errcode='22023'; end if;
      select * into assignment_row from public.vendor_event_assignments where owner_id=actor and receipt_id=receipt for update;
      actual_previous:=case when found then assignment_row.event_id else null end;
      if actual_previous is distinct from (r->>'previousEventId')::uuid then raise exception 'Receipt association changed' using errcode='PT409'; end if;
      if actual_previous is not null then
        if not exists(select 1 from public.vendor_events where owner_id=actor and event_id=actual_previous and status='open') then
          raise exception 'Reopen the previous event before reassignment' using errcode='PT409'; end if;
        affected:=affected||array[actual_previous];
      end if;
      before_rows:=before_rows||jsonb_build_array(jsonb_build_object('receipt_id',receipt,'event_id',actual_previous));
      insert into public.vendor_event_assignments(owner_id,receipt_id,event_id,revision) values(actor,receipt,target,next_revision)
        on conflict(owner_id,receipt_id) do update set event_id=excluded.event_id,revision=excluded.revision,updated_at=now()
        returning * into assignment_row;
      after_rows:=after_rows||jsonb_build_array(to_jsonb(assignment_row));
    end loop;
  else raise exception 'Unsupported event operation' using errcode='22023';
  end if;
  result:=jsonb_build_object('version',1,'ownerId',actor,'requestId',rid,'previousRevision',expected::text,
    'revision',next_revision::text,'operation',v);
  update public.vendor_event_owners set revision=next_revision where owner_id=actor;
  select coalesce(array_agg(distinct x order by x),'{}'::uuid[]) into affected from unnest(affected) x where x is not null;
  insert into public.vendor_event_requests(owner_id,request_id,revision,request,result,affected_event_ids,before_state,after_state)
    values(actor,rid,next_revision,p_request,result,affected,before_rows,after_rows);
  return result;
end $$;

create or replace function public.vendor_event_request_read_v1(p_request_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='28000'; end if;
  if p_request_id is null then raise exception 'Invalid event request identity' using errcode='22023'; end if;
  select r.result into result from public.vendor_event_requests r where r.owner_id=auth.uid() and r.request_id=p_request_id;
  return result;
end $$;

create or replace function public.vendor_event_read_v1(p_event_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  actor uuid:=auth.uid(); current_revision bigint; events jsonb; expenses jsonb:='[]'; assignments jsonb:='[]';
  assignment_map jsonb:='{}'; candidates jsonb:=null; conflicts jsonb:='[]'; selected jsonb:=null;
  event_row public.vendor_events%rowtype; receipt_access boolean; enabled boolean; book jsonb; book_revision bigint;
  result jsonb;
begin
  if actor is null then raise exception 'Sign in required' using errcode='28000'; end if;
  select revision into current_revision from public.vendor_event_owners where owner_id=actor;
  receipt_access:=coalesce((select c.enabled from public.vendor_receipt_cloud_control c where singleton),false);
  enabled:=coalesce((select c.enabled from public.vendor_event_control c where singleton),false) and receipt_access;
  select coalesce(jsonb_agg(jsonb_build_object('eventId',e.event_id,'name',e.name,'startDate',to_char(e.start_date,'YYYY-MM-DD'),
    'endDate',to_char(e.end_date,'YYYY-MM-DD'),'timeZone',e.time_zone,'currency',e.currency,'notes',e.notes,'status',e.status,
    'stateReason',e.state_reason,'revision',e.revision::text,'createdAt',e.created_at,'updatedAt',e.updated_at) order by e.event_id),'[]'::jsonb)
    into events from public.vendor_events e where e.owner_id=actor;
  if p_event_id is not null then
    select * into event_row from public.vendor_events where owner_id=actor and event_id=p_event_id;
    if not found then raise exception 'Event unavailable' using errcode='22023'; end if;
    select coalesce(jsonb_agg(jsonb_build_object('expenseId',e.expense_id,'eventId',e.event_id,'category',e.category,
      'description',e.description,'amountMinor',e.amount_minor::text,'currency',e.currency,'incurredOn',to_char(e.incurred_on,'YYYY-MM-DD'),
      'voided',e.voided,'lastReason',e.last_reason,'revision',e.revision::text,'createdAt',e.created_at,'updatedAt',e.updated_at)
      order by e.expense_id),'[]'::jsonb) into expenses from public.vendor_event_expenses e where e.owner_id=actor and e.event_id=p_event_id;
    select coalesce(jsonb_agg(jsonb_build_object('receiptId',a.receipt_id,'eventId',a.event_id,'revision',a.revision::text) order by a.receipt_id),'[]'::jsonb),
      coalesce(jsonb_object_agg(a.receipt_id::text,a.event_id),'{}'::jsonb) into assignments,assignment_map
      from public.vendor_event_assignments a where a.owner_id=actor;
    if receipt_access then
      select b.book,b.revision into book,book_revision from public.vendor_receipt_books b where b.owner_id=actor;
      book:=coalesce(book,'{"receipts":[]}'::jsonb);book_revision:=coalesce(book_revision,0);
      if exists(select 1 from jsonb_array_elements(book->'receipts') r where
        not public.vendor_event_uuid_valid_v1(to_jsonb(lower(r->'receipt'->>'id')))) then
        raise exception 'Receipt identities need review' using errcode='22023'; end if;
      select coalesce(jsonb_agg(id order by id),'[]'::jsonb) into conflicts from (
        select lower(r->'receipt'->>'id') id from jsonb_array_elements(book->'receipts') r
        group by lower(r->'receipt'->>'id') having count(*)>1) duplicated;
      begin
        if exists(select 1 from jsonb_array_elements(book->'receipts') r where
          jsonb_typeof(r->'receipt'->'createdAt') is distinct from 'string'
          or not coalesce(isfinite((r->'receipt'->>'createdAt')::timestamptz),false)) then
          raise exception 'Receipt dates need review' using errcode='22023'; end if;
        with dates as (
          select lower(r->'receipt'->>'id') receipt_id,
            ((r->'receipt'->>'createdAt')::timestamptz at time zone event_row.time_zone)::date local_date
          from jsonb_array_elements(book->'receipts') r where not(conflicts ? lower(r->'receipt'->>'id'))
        ) select coalesce(jsonb_agg(jsonb_build_object('receiptId',d.receipt_id,'localDate',to_char(d.local_date,'YYYY-MM-DD'),
            'previousEventId',assignment_map->d.receipt_id) order by d.receipt_id),'[]'::jsonb)
          into candidates from dates d where d.local_date between event_row.start_date and event_row.end_date;
      exception when datetime_field_overflow or invalid_datetime_format then
        raise exception 'Receipt dates need review' using errcode='22023';
      end;
    end if;
    selected:=jsonb_build_object('eventId',p_event_id,'expenses',expenses,'assignments',assignments,
      'candidates',candidates,'receiptIdentityConflicts',conflicts,'bookRevision',book_revision::text);
  end if;
  result:=jsonb_build_object('version',1,'ownerId',actor,'revision',coalesce(current_revision,0)::text,
    'entryEnabled',enabled,'receiptAccess',receipt_access,'events',events,'selected',selected);
  if octet_length(result::text)>10000000 then raise exception 'Event history exceeds the supported read size' using errcode='22023'; end if;
  return result;
end $$;

create or replace function public.vendor_event_history_read_v1(p_event_id uuid,p_before_revision text default null,p_limit integer default 50)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid(); cutoff bigint; rows jsonb; next_revision text; result jsonb;
begin
  if actor is null then raise exception 'Sign in required' using errcode='28000'; end if;
  if p_limit is null or p_limit not between 1 and 100 or p_event_id is null then raise exception 'Invalid event history request' using errcode='22023'; end if;
  if p_before_revision is not null and not public.vendor_event_decimal_valid_v1(to_jsonb(p_before_revision),9223372036854775807) then
    raise exception 'Invalid event history cursor' using errcode='22023'; end if;
  cutoff:=p_before_revision::bigint;
  if not exists(select 1 from public.vendor_events where owner_id=actor and event_id=p_event_id) then raise exception 'Event unavailable' using errcode='22023'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('requestId',r.request_id,'revision',r.revision::text,'createdAt',r.created_at,
    'operation',r.request->'operation','before',r.before_state,'after',r.after_state) order by r.revision desc),'[]'::jsonb) into rows from (
      select * from public.vendor_event_requests where owner_id=actor and affected_event_ids @> array[p_event_id]
        and (cutoff is null or revision<cutoff) order by revision desc limit p_limit+1) r;
  if jsonb_array_length(rows)>p_limit then
    rows:=rows-p_limit; next_revision:=rows->(p_limit-1)->>'revision';
  end if;
  result:=jsonb_build_object('version',1,'ownerId',actor,'eventId',p_event_id,'rows',rows,'nextRevision',next_revision);
  if octet_length(result::text)>10000000 then raise exception 'Event history exceeds the supported read size' using errcode='22023'; end if;
  return result;
end $$;

revoke all on function public.vendor_event_fields_valid_v1(jsonb,text[]),
  public.vendor_event_uuid_valid_v1(jsonb,boolean),public.vendor_event_text_valid_v1(jsonb,integer,integer,boolean),
  public.vendor_event_decimal_valid_v1(jsonb,numeric),public.vendor_event_date_valid_v1(jsonb),
  public.vendor_event_request_validate_v1(jsonb),public.vendor_event_mutate_v1(jsonb),
  public.vendor_event_request_read_v1(uuid),public.vendor_event_read_v1(uuid),
  public.vendor_event_history_read_v1(uuid,text,integer) from public,anon,authenticated,service_role;
grant execute on function public.vendor_event_mutate_v1(jsonb),public.vendor_event_request_read_v1(uuid),
  public.vendor_event_read_v1(uuid),public.vendor_event_history_read_v1(uuid,text,integer) to authenticated;
notify pgrst,'reload schema';
commit;
