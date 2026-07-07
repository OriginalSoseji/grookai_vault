begin;

create or replace function public.notification_register_device_token_v1(
  p_token text,
  p_platform text,
  p_app_build text default null,
  p_device_label text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_token text := btrim(coalesce(p_token, ''));
  v_platform text := lower(btrim(coalesce(p_platform, '')));
  v_device_token_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if v_token = '' then
    raise exception 'device token is required';
  end if;

  if v_platform not in ('android', 'ios') then
    raise exception 'unsupported notification platform';
  end if;

  insert into public.device_tokens (
    user_id,
    token,
    platform,
    app_build,
    device_label,
    last_seen_at,
    disabled_at
  ) values (
    v_user_id,
    v_token,
    v_platform,
    nullif(btrim(coalesce(p_app_build, '')), ''),
    nullif(btrim(coalesce(p_device_label, '')), ''),
    now(),
    null
  )
  on conflict (token) do update set
    user_id = v_user_id,
    platform = excluded.platform,
    app_build = excluded.app_build,
    device_label = excluded.device_label,
    last_seen_at = now(),
    disabled_at = null,
    updated_at = now()
  returning id into v_device_token_id;

  return v_device_token_id;
end;
$$;

revoke all on function public.notification_register_device_token_v1(text, text, text, text) from anon, authenticated;
grant execute on function public.notification_register_device_token_v1(text, text, text, text) to authenticated;

create or replace function public.notification_disable_device_token_v1(
  p_token text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_token text := btrim(coalesce(p_token, ''));
  v_updated integer;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if v_token = '' then
    return false;
  end if;

  update public.device_tokens
  set
    disabled_at = coalesce(disabled_at, now()),
    updated_at = now()
  where user_id = v_user_id
    and token = v_token
    and disabled_at is null;

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

revoke all on function public.notification_disable_device_token_v1(text) from anon, authenticated;
grant execute on function public.notification_disable_device_token_v1(text) to authenticated;

create or replace function public.mark_notification_tapped_v1(
  p_notification_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_updated integer;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  update public.notifications_log
  set tapped_at = now()
  where id = p_notification_id
    and recipient_user_id = v_user_id
    and tapped_at is null;

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

revoke all on function public.mark_notification_tapped_v1(uuid) from anon, authenticated;
grant execute on function public.mark_notification_tapped_v1(uuid) to authenticated;

commit;
