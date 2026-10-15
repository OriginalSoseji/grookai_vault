-- Receipt-only outbox. No money movement, inventory writes or marketing messages.
begin;
create table public.vendor_receipt_delivery_control (
  singleton boolean primary key default true check(singleton),
  email_enabled boolean not null default false,
  sms_enabled boolean not null default false
);
insert into public.vendor_receipt_delivery_control(singleton) values(true);
alter table public.vendor_receipt_delivery_control enable row level security;
revoke all on public.vendor_receipt_delivery_control from public,anon,authenticated;

create table public.vendor_receipt_deliveries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  receipt_id uuid not null,
  channel text not null check(channel in ('email','sms')),
  destination text not null check(length(destination) between 3 and 254),
  receipt jsonb not null check(jsonb_typeof(receipt)='object'),
  template_version integer not null default 1 check(template_version=1),
  status text not null default 'queued' check(status in ('queued','sending','accepted','delivered','failed','uncertain')),
  claim_token uuid,
  provider_id text,
  failure_code text,
  created_at timestamptz not null default now(),
  attempted_at timestamptz,
  checked_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(owner_id,request_id),
  unique(owner_id,receipt_id,channel,destination)
);
create index vendor_receipt_deliveries_owner_created_idx on public.vendor_receipt_deliveries(owner_id,created_at desc);
alter table public.vendor_receipt_deliveries enable row level security;
revoke all on public.vendor_receipt_deliveries from public,anon,authenticated;

create function public.vendor_receipt_delivery_view_v1(d public.vendor_receipt_deliveries)
returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('id',d.id,'receiptId',d.receipt_id,'channel',d.channel,
   'destination',d.destination,'status',case when d.status='sending' and d.attempted_at<now()-interval '2 minutes' then 'uncertain' else d.status end,
   'createdAt',d.created_at,'updatedAt',d.updated_at);
$$;
revoke all on function public.vendor_receipt_delivery_view_v1(public.vendor_receipt_deliveries) from public,anon,authenticated;

create function public.vendor_receipt_delivery_capabilities_v1()
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 return (select jsonb_build_object('email',c.email_enabled and b.enabled,'sms',c.sms_enabled and b.enabled)
   from public.vendor_receipt_delivery_control c cross join public.vendor_receipt_cloud_control b where c.singleton and b.singleton);
end; $$;

create function public.vendor_receipt_delivery_request_v1(p_request_id uuid,p_receipt_id uuid,p_channel text,p_destination text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); saved jsonb; existing public.vendor_receipt_deliveries; target text:=btrim(p_destination); book jsonb;
begin
 if actor is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if p_request_id is null or p_receipt_id is null or p_channel is null or p_channel not in ('email','sms') or target is null then
   raise exception 'Invalid receipt delivery' using errcode='22023'; end if;
 if (p_channel='email' and (length(target)>254 or target !~ '^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$'))
   or (p_channel='sms' and target !~ '^\+[1-9][0-9]{7,14}$') or target ~ '[[:cntrl:]]' then
   raise exception 'Invalid destination' using errcode='22023'; end if;
 -- Serialize per-owner requests, including quota and different request IDs for the same receipt.
 select b.book into book from public.vendor_receipt_books b where b.owner_id=actor for update;
 select d.* into existing from public.vendor_receipt_deliveries d where d.owner_id=actor and d.request_id=p_request_id;
 if found then
   if existing.receipt_id<>p_receipt_id or existing.channel<>p_channel or existing.destination<>target then
     raise exception 'Request identity already used' using errcode='PT409'; end if;
   return public.vendor_receipt_delivery_view_v1(existing);
 end if;
 select d.* into existing from public.vendor_receipt_deliveries d
   where d.owner_id=actor and d.receipt_id=p_receipt_id and d.channel=p_channel and d.destination=target;
 if found then return public.vendor_receipt_delivery_view_v1(existing); end if;
 if not coalesce((public.vendor_receipt_delivery_capabilities_v1()->>p_channel)::boolean,false) then
   raise exception 'Receipt sending is unavailable' using errcode='42501'; end if;
 select entry->'receipt' into saved from jsonb_array_elements(book->'receipts') entry where entry->'receipt'->>'id'=p_receipt_id::text;
 if saved is null then raise exception 'Receipt unavailable' using errcode='42501'; end if;
 if (select count(*) from public.vendor_receipt_deliveries d where d.owner_id=actor and d.created_at>now()-interval '1 hour')>=100
   or (select count(*) from public.vendor_receipt_deliveries d where d.owner_id=actor and d.created_at>now()-interval '1 day')>=500 then
   raise exception 'Receipt sending limit reached' using errcode='PT429'; end if;
 insert into public.vendor_receipt_deliveries(owner_id,request_id,receipt_id,channel,destination,receipt)
   values(actor,p_request_id,p_receipt_id,p_channel,target,saved) returning * into existing;
 return public.vendor_receipt_delivery_view_v1(existing);
end; $$;

create function public.vendor_receipt_delivery_read_v1(p_receipt_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 return (select coalesce(jsonb_agg(public.vendor_receipt_delivery_view_v1(d) order by d.created_at desc),'[]'::jsonb)
   from public.vendor_receipt_deliveries d where d.owner_id=auth.uid() and d.receipt_id=p_receipt_id);
end; $$;

-- Service-only claim is the sole permission to contact a provider. A claim is never re-leased:
-- an interrupted attempt is uncertain, not safe evidence that no message was sent.
create function public.vendor_receipt_delivery_claim_v1(p_owner_id uuid,p_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d public.vendor_receipt_deliveries;
begin
 select * into d from public.vendor_receipt_deliveries where id=p_id and owner_id=p_owner_id for update;
 if not found or d.status<>'queued' then return null; end if;
 if not exists(select 1 from public.vendor_receipt_delivery_control c cross join public.vendor_receipt_cloud_control b
   where c.singleton and b.singleton and b.enabled and case d.channel when 'email' then c.email_enabled else c.sms_enabled end) then return null; end if;
 update public.vendor_receipt_deliveries set status='sending',claim_token=gen_random_uuid(),attempted_at=now(),updated_at=now()
   where id=d.id returning * into d;
 return to_jsonb(d);
end; $$;

create function public.vendor_receipt_delivery_finish_v1(p_id uuid,p_claim_token uuid,p_status text,p_provider_id text default null,p_failure_code text default null)
returns void language plpgsql security definer set search_path='' as $$
begin
 if p_status is null or p_status not in ('accepted','failed','uncertain')
   or (p_status='accepted' and (p_provider_id is null or length(p_provider_id) not between 1 and 100))
   or length(p_failure_code)>80 then raise exception 'Invalid delivery outcome' using errcode='22023'; end if;
 update public.vendor_receipt_deliveries set status=p_status,provider_id=p_provider_id,failure_code=p_failure_code,updated_at=now()
   where id=p_id and claim_token=p_claim_token and status='sending';
end; $$;

create function public.vendor_receipt_delivery_settle_v1(p_owner_id uuid,p_id uuid,p_provider_id text,p_status text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if p_status is null or p_status not in ('delivered','failed') then raise exception 'Invalid delivery status' using errcode='22023'; end if;
 update public.vendor_receipt_deliveries set status=p_status,updated_at=now()
   where id=p_id and owner_id=p_owner_id and provider_id=p_provider_id and status='accepted';
end; $$;

create function public.vendor_receipt_delivery_poll_v1(p_owner_id uuid,p_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d public.vendor_receipt_deliveries;
begin
 update public.vendor_receipt_deliveries set checked_at=now()
   where id=p_id and owner_id=p_owner_id and status='accepted'
   and (checked_at is null or checked_at<now()-interval '30 seconds') returning * into d;
 if not found then return null; end if;
 return to_jsonb(d);
end; $$;

revoke all on function public.vendor_receipt_delivery_capabilities_v1() from public,anon;
revoke all on function public.vendor_receipt_delivery_request_v1(uuid,uuid,text,text) from public,anon;
revoke all on function public.vendor_receipt_delivery_read_v1(uuid) from public,anon;
grant execute on function public.vendor_receipt_delivery_capabilities_v1(),public.vendor_receipt_delivery_request_v1(uuid,uuid,text,text),public.vendor_receipt_delivery_read_v1(uuid) to authenticated;
revoke all on function public.vendor_receipt_delivery_claim_v1(uuid,uuid),public.vendor_receipt_delivery_finish_v1(uuid,uuid,text,text,text),public.vendor_receipt_delivery_settle_v1(uuid,uuid,text,text),public.vendor_receipt_delivery_poll_v1(uuid,uuid) from public,anon,authenticated;
grant execute on function public.vendor_receipt_delivery_claim_v1(uuid,uuid),public.vendor_receipt_delivery_finish_v1(uuid,uuid,text,text,text),public.vendor_receipt_delivery_settle_v1(uuid,uuid,text,text),public.vendor_receipt_delivery_poll_v1(uuid,uuid) to service_role;
commit;
