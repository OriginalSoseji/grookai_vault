begin;

-- Shared admission for production scan workers. Disabled until a separately
-- verified reference release is bound. These are resource controls, not billing.
create table public.vendor_scan_control (
  singleton boolean primary key default true check(singleton),
  enabled boolean not null default false,
  global_concurrency integer not null default 4 check(global_concurrency between 1 and 16),
  per_minute integer not null default 50 check(per_minute between 1 and 120),
  per_day integer not null default 2000 check(per_day between 1 and 10000),
  database_ref text,
  artifact_sha256 text,
  metadata_sha256 text,
  feature_manifest_sha256 text,
  check (not enabled or (database_ref = 'ycdxbpibncqcchqiihfz'
    and artifact_sha256 ~ '^[0-9a-f]{64}$'
    and metadata_sha256 ~ '^[0-9a-f]{64}$'
    and feature_manifest_sha256 ~ '^[0-9a-f]{64}$'
    and database_ref is not null and artifact_sha256 is not null
    and metadata_sha256 is not null and feature_manifest_sha256 is not null))
);
insert into public.vendor_scan_control(singleton) values(true);
create table public.vendor_scan_usage (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  minute_start timestamptz not null,
  minute_count integer not null check(minute_count >= 0),
  day_start timestamptz not null,
  day_count integer not null check(day_count >= 0)
);
create table public.vendor_scan_leases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  expires_at timestamptz not null
);
alter table public.vendor_scan_control enable row level security;
alter table public.vendor_scan_usage enable row level security;
alter table public.vendor_scan_leases enable row level security;
revoke all on public.vendor_scan_control,public.vendor_scan_usage,public.vendor_scan_leases from public,anon,authenticated,service_role;
grant select,update on public.vendor_scan_control to service_role;
grant select on public.vendor_scan_usage,public.vendor_scan_leases to service_role;

create function public.vendor_scan_acquire_v1(p_owner uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare ctl public.vendor_scan_control; usage public.vendor_scan_usage;
  t timestamptz; minute_key timestamptz; day_key timestamptz; lease uuid;
begin
  -- One singleton lock serializes grants across all server instances. Check the
  -- clock after acquiring it so expiry/rate windows do not use a stale instant.
  select * into ctl from public.vendor_scan_control where singleton for update;
  if not found or not ctl.enabled then return null; end if;
  if p_owner is null or not exists(select 1 from public.vendor_stores where owner_id=p_owner)
    or not exists(select 1 from public.vendor_store_rollout where app_enabled)
    or not coalesce((public.vendor_store_capabilities_v1(p_owner)->>'store_app')::boolean,false)
  then return null; end if;
  t := clock_timestamp(); minute_key := date_trunc('minute',t); day_key := date_trunc('day',t at time zone 'UTC') at time zone 'UTC';
  delete from public.vendor_scan_leases where expires_at <= t;
  if exists(select 1 from public.vendor_scan_leases where owner_id=p_owner)
    or (select count(*) from public.vendor_scan_leases) >= ctl.global_concurrency then return null; end if;
  select * into usage from public.vendor_scan_usage where owner_id=p_owner;
  if found and ((usage.minute_start=minute_key and usage.minute_count>=ctl.per_minute)
    or (usage.day_start=day_key and usage.day_count>=ctl.per_day)) then return null; end if;
  insert into public.vendor_scan_usage(owner_id,minute_start,minute_count,day_start,day_count)
    values(p_owner,minute_key,1,day_key,1)
    on conflict(owner_id) do update set minute_start=excluded.minute_start,
      minute_count=case when vendor_scan_usage.minute_start=excluded.minute_start then vendor_scan_usage.minute_count+1 else 1 end,
      day_start=excluded.day_start,
      day_count=case when vendor_scan_usage.day_start=excluded.day_start then vendor_scan_usage.day_count+1 else 1 end;
  -- Long enough for the 45s HTTP/worker budget; crashes recover without a job.
  insert into public.vendor_scan_leases(owner_id,expires_at) values(p_owner,t+interval '60 seconds') returning id into lease;
  return jsonb_build_object('lease',lease,'database_ref',ctl.database_ref,
    'artifact_sha256',ctl.artifact_sha256,'metadata_sha256',ctl.metadata_sha256,
    'feature_manifest_sha256',ctl.feature_manifest_sha256);
end; $$;
create function public.vendor_scan_release_v1(p_lease uuid) returns void
language sql security definer set search_path='' as $$
  delete from public.vendor_scan_leases where id=p_lease;
$$;
revoke all on function public.vendor_scan_acquire_v1(uuid),public.vendor_scan_release_v1(uuid) from public,anon,authenticated;
grant execute on function public.vendor_scan_acquire_v1(uuid),public.vendor_scan_release_v1(uuid) to service_role;

commit;
