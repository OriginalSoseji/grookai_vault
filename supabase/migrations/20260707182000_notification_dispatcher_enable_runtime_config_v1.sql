begin;

create table if not exists public.notification_dispatcher_runtime_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now(),
  constraint notification_dispatcher_runtime_config_key_check check (
    key in ('enabled', 'url', 'shared_secret')
  )
);

alter table public.notification_dispatcher_runtime_config enable row level security;

revoke all on public.notification_dispatcher_runtime_config from public, anon, authenticated;
grant all on public.notification_dispatcher_runtime_config to service_role;

drop policy if exists notification_dispatcher_runtime_config_service_role_all
on public.notification_dispatcher_runtime_config;

create policy notification_dispatcher_runtime_config_service_role_all
on public.notification_dispatcher_runtime_config
for all
to service_role
using (true)
with check (true);

create or replace function public.touch_notification_dispatcher_runtime_config_v1()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_notification_dispatcher_runtime_config_v1
on public.notification_dispatcher_runtime_config;

create trigger trg_touch_notification_dispatcher_runtime_config_v1
before update on public.notification_dispatcher_runtime_config
for each row
execute function public.touch_notification_dispatcher_runtime_config_v1();

create or replace function public.notification_dispatcher_scheduled_http_v1()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_enabled text;
  v_url text;
  v_secret text;
  v_headers jsonb;
begin
  select lower(value)
  into v_enabled
  from public.notification_dispatcher_runtime_config
  where key = 'enabled';

  if coalesce(v_enabled, 'false') <> 'true' then
    return;
  end if;

  select nullif(value, '')
  into v_url
  from public.notification_dispatcher_runtime_config
  where key = 'url';

  select nullif(value, '')
  into v_secret
  from public.notification_dispatcher_runtime_config
  where key = 'shared_secret';

  if v_url is null or v_secret is null then
    perform public.notification_log_emit_failure_v1(
      'notification_dispatcher_schedule',
      null,
      null,
      'notification_dispatcher_schedule',
      jsonb_build_object('url_configured', v_url is not null, 'secret_configured', v_secret is not null),
      'notification dispatcher schedule is enabled without url/secret runtime config'
    );
    return;
  end if;

  v_headers := jsonb_build_object(
    'authorization', 'Bearer ' || v_secret,
    'content-type', 'application/json'
  );

  perform net.http_post(
    url := v_url,
    headers := v_headers,
    body := jsonb_build_object('limit', 50),
    timeout_milliseconds := 30000
  );
exception
  when others then
    perform public.notification_log_emit_failure_v1(
      'notification_dispatcher_schedule',
      null,
      null,
      'notification_dispatcher_schedule',
      jsonb_build_object('url_configured', v_url is not null),
      sqlerrm
    );
end;
$$;

revoke all on function public.notification_dispatcher_scheduled_http_v1() from anon, authenticated;
grant execute on function public.notification_dispatcher_scheduled_http_v1() to service_role;

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron')
     and exists (select 1 from pg_namespace where nspname = 'net') then
    perform cron.unschedule(jobid)
    from cron.job
    where jobname in (
      'notification-dispatcher-disabled-v1',
      'notification-dispatcher-every-minute-v1'
    );

    perform cron.schedule(
      'notification-dispatcher-every-minute-v1',
      '* * * * *',
      'select public.notification_dispatcher_scheduled_http_v1();'
    );
  else
    raise notice 'pg_cron/pg_net not installed locally; notification dispatcher schedule function installed, cron job skipped';
  end if;
exception
  when others then
    raise notice 'notification dispatcher cron schedule update skipped: %', sqlerrm;
end;
$$;

commit;
