begin;

create or replace function public.notification_dispatcher_scheduled_http_v1()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_enabled text := lower(coalesce(nullif(current_setting('app.notification_dispatcher_enabled', true), ''), 'false'));
  v_url text := nullif(current_setting('app.notification_dispatcher_url', true), '');
  v_secret text := nullif(current_setting('app.notification_dispatcher_shared_secret', true), '');
  v_headers jsonb;
begin
  if v_enabled <> 'true' then
    return;
  end if;

  if v_url is null or v_secret is null then
    perform public.notification_log_emit_failure_v1(
      'notification_dispatcher_schedule',
      null,
      null,
      'notification_dispatcher_schedule',
      jsonb_build_object('url_configured', v_url is not null, 'secret_configured', v_secret is not null),
      'notification dispatcher schedule is enabled without url/secret settings'
    );
    return;
  end if;

  v_headers := jsonb_build_object(
    'authorization', 'Bearer ' || v_secret,
    'content-type', 'application/json'
  );

  execute
    'select net.http_post(url := $1, headers := $2, body := $3, timeout_milliseconds := 30000)'
  using
    v_url,
    v_headers,
    jsonb_build_object('limit', 50);
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
    execute
      'select cron.schedule(' ||
      quote_literal('notification-dispatcher-disabled-v1') || ', ' ||
      quote_literal('0 0 1 1 *') || ', ' ||
      quote_literal('select public.notification_dispatcher_scheduled_http_v1();') ||
      ')';
  else
    raise notice 'pg_cron/pg_net not installed locally; notification dispatcher schedule function installed, cron job skipped';
  end if;
exception
  when others then
    raise notice 'notification dispatcher cron schedule skipped: %', sqlerrm;
end;
$$;

commit;
