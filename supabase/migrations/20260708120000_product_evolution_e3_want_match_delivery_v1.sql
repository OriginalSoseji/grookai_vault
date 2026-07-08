begin;

create table if not exists public.want_match_job_state (
  job_name text primary key,
  cursor_user_id uuid null,
  last_started_at timestamptz null,
  last_finished_at timestamptz null,
  last_result jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint want_match_job_state_job_name_check
    check (job_name = any (array['instant_candidate_pass'::text, 'daily_digest_aggregation'::text])),
  constraint want_match_job_state_result_object_check
    check (jsonb_typeof(last_result) = 'object')
);

alter table public.want_match_job_state enable row level security;
revoke all on table public.want_match_job_state from public, anon, authenticated;
grant all on table public.want_match_job_state to service_role;

drop policy if exists want_match_job_state_service_role_all on public.want_match_job_state;
create policy want_match_job_state_service_role_all
on public.want_match_job_state
for all
to service_role
using (true)
with check (true);

drop trigger if exists trg_want_match_job_state_updated_at on public.want_match_job_state;
create trigger trg_want_match_job_state_updated_at
before update on public.want_match_job_state
for each row
execute function public.set_timestamp_updated_at();

create or replace function public.want_match_log_delivery_failure_v1(
  p_source text,
  p_source_id uuid,
  p_recipient_user_id uuid,
  p_event_type text,
  p_payload jsonb,
  p_error text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notification_emit_failures (
    source,
    source_id,
    recipient_user_id,
    event_type,
    error_message,
    payload
  ) values (
    left(coalesce(nullif(btrim(p_source), ''), 'want_match_delivery'), 120),
    p_source_id,
    p_recipient_user_id,
    p_event_type,
    left(coalesce(nullif(btrim(p_error), ''), 'want_match_delivery_failed'), 1000),
    coalesce(p_payload, '{}'::jsonb)
  );
exception
  when others then
    null;
end;
$$;

create or replace function public.enqueue_want_match_instant_notifications_v1(
  p_limit integer default 500,
  p_dry_run boolean default false
)
returns table (
  want_match_id uuid,
  outbox_id uuid,
  action text,
  dedupe_key text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match record;
  v_limit integer := least(greatest(coalesce(p_limit, 500), 1), 1000);
  v_dedupe_key text;
  v_event_id uuid;
  v_outbox_id uuid;
begin
  for v_match in
    select
      wm.id,
      wm.want_user_id,
      wm.owner_user_id,
      wm.card_print_id,
      wm.distance_bucket,
      wm.intent,
      wm.match_strength,
      wm.recommended_tier,
      wm.payload,
      cp.gv_id,
      cp.name as card_name,
      pp.slug as owner_slug,
      pp.display_name as owner_display_name
    from public.want_matches wm
    join public.card_prints cp on cp.id = wm.card_print_id
    join public.public_profiles pp on pp.user_id = wm.owner_user_id
    where wm.status = 'active'
      and wm.recommended_tier = 'instant'
      and wm.distance_bucket = 'nearby'
      and wm.intent = 'trade'
      and wm.match_strength >= 0.85
      and not exists (
        select 1
        from public.notification_outbox o
        where o.recipient_user_id = wm.want_user_id
          and o.dedupe_key = 'want_match_available:' || wm.id::text
      )
    order by wm.last_seen_available_at desc, wm.match_strength desc, wm.id
    limit v_limit
  loop
    v_dedupe_key := 'want_match_available:' || v_match.id::text;
    select ce.id
    into v_event_id
    from public.card_events ce
    where ce.dedupe_key = v_dedupe_key
    limit 1;

    if p_dry_run then
      want_match_id := v_match.id;
      outbox_id := null;
      action := 'dry_run';
      dedupe_key := v_dedupe_key;
      return next;
    else
      begin
        insert into public.notification_outbox (
          recipient_user_id,
          event_type,
          tier,
          card_print_id,
          actor_user_id,
          card_event_id,
          payload,
          dedupe_key
        ) values (
          v_match.want_user_id,
          'want_match_available',
          'instant',
          v_match.card_print_id,
          v_match.owner_user_id,
          v_event_id,
          jsonb_strip_nulls(v_match.payload || jsonb_build_object(
            'want_match_id', v_match.id,
            'gv_id', v_match.gv_id,
            'card_name', v_match.card_name,
            'owner_slug', v_match.owner_slug,
            'owner_display_name', v_match.owner_display_name,
            'distance_bucket', v_match.distance_bucket,
            'intent', v_match.intent,
            'match_strength', v_match.match_strength,
            'recommended_tier', v_match.recommended_tier
          )),
          v_dedupe_key
        )
        on conflict do nothing
        returning id into v_outbox_id;

        want_match_id := v_match.id;
        outbox_id := v_outbox_id;
        action := case when v_outbox_id is null then 'exists' else 'enqueued' end;
        dedupe_key := v_dedupe_key;
        return next;
      exception
        when others then
          perform public.want_match_log_delivery_failure_v1(
            'want_match_instant_enqueue',
            v_match.id,
            v_match.want_user_id,
            'want_match_available',
            jsonb_build_object('dedupe_key', v_dedupe_key, 'want_match_id', v_match.id),
            sqlerrm
          );
          want_match_id := v_match.id;
          outbox_id := null;
          action := 'failed';
          dedupe_key := v_dedupe_key;
          return next;
      end;
    end if;
  end loop;
end;
$$;

create or replace function public.enqueue_want_match_digest_notifications_v1(
  p_window_date date default current_date,
  p_limit_users integer default 500,
  p_dry_run boolean default false
)
returns table (
  recipient_user_id uuid,
  outbox_id uuid,
  action text,
  dedupe_key text,
  match_count integer,
  top_match_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user record;
  v_limit integer := least(greatest(coalesce(p_limit_users, 500), 1), 1000);
  v_window_key text := to_char(coalesce(p_window_date, current_date), 'YYYY-MM-DD');
  v_dedupe_key text;
  v_outbox_id uuid;
begin
  for v_user in
    with digest_source as (
      select
        wm.*,
        cp.gv_id,
        cp.name as card_name,
        cp.set_code,
        cp.number,
        pp.slug as owner_slug,
        pp.display_name as owner_display_name
      from public.want_matches wm
      join public.card_prints cp on cp.id = wm.card_print_id
      join public.public_profiles pp on pp.user_id = wm.owner_user_id
      where wm.status = 'active'
        and wm.recommended_tier = 'digest'
    ),
    ranked_digest_matches as (
      select
        digest_source.*,
        row_number() over (
          partition by digest_source.want_user_id
          order by digest_source.match_strength desc, digest_source.last_seen_available_at desc, digest_source.id
        ) as rank_for_user
      from digest_source
    ),
    digest_rollups as (
      select
        digest_source.want_user_id,
        count(*)::integer as match_count,
        array_agg(digest_source.id order by digest_source.match_strength desc, digest_source.last_seen_available_at desc, digest_source.id) as match_ids
      from digest_source
      group by digest_source.want_user_id
    )
    select ranked_digest_matches.*, digest_rollups.match_count, digest_rollups.match_ids
    from ranked_digest_matches
    join digest_rollups on digest_rollups.want_user_id = ranked_digest_matches.want_user_id
    where ranked_digest_matches.rank_for_user = 1
      and not exists (
        select 1
        from public.notification_outbox o
        where o.recipient_user_id = ranked_digest_matches.want_user_id
          and o.dedupe_key = 'want_match_digest:' || ranked_digest_matches.want_user_id::text || ':' || v_window_key
      )
    order by ranked_digest_matches.match_strength desc, ranked_digest_matches.last_seen_available_at desc, ranked_digest_matches.id
    limit v_limit
  loop
    v_dedupe_key := 'want_match_digest:' || v_user.want_user_id::text || ':' || v_window_key;

    if p_dry_run then
      recipient_user_id := v_user.want_user_id;
      outbox_id := null;
      action := 'dry_run';
      dedupe_key := v_dedupe_key;
      match_count := v_user.match_count;
      top_match_id := v_user.id;
      return next;
    else
      begin
        insert into public.notification_outbox (
          recipient_user_id,
          event_type,
          tier,
          card_print_id,
          actor_user_id,
          payload,
          dedupe_key
        ) values (
          v_user.want_user_id,
          'want_match_digest',
          'daily_pulse',
          v_user.card_print_id,
          v_user.owner_user_id,
          jsonb_strip_nulls(jsonb_build_object(
            'window_key', v_window_key,
            'match_count', v_user.match_count,
            'top_match_id', v_user.id,
            'top_card', jsonb_build_object(
              'gv_id', v_user.gv_id,
              'name', v_user.card_name,
              'set_code', v_user.set_code,
              'number', v_user.number
            ),
            'compact_match_ids', to_jsonb(v_user.match_ids[1:10]),
            'distance_bucket', v_user.distance_bucket,
            'owner_slug', v_user.owner_slug,
            'owner_display_name', v_user.owner_display_name
          )),
          v_dedupe_key
        )
        on conflict do nothing
        returning id into v_outbox_id;

        recipient_user_id := v_user.want_user_id;
        outbox_id := v_outbox_id;
        action := case when v_outbox_id is null then 'exists' else 'enqueued' end;
        dedupe_key := v_dedupe_key;
        match_count := v_user.match_count;
        top_match_id := v_user.id;
        return next;
      exception
        when others then
          perform public.want_match_log_delivery_failure_v1(
            'want_match_digest_enqueue',
            v_user.id,
            v_user.want_user_id,
            'want_match_digest',
            jsonb_build_object('dedupe_key', v_dedupe_key, 'window_key', v_window_key),
            sqlerrm
          );
          recipient_user_id := v_user.want_user_id;
          outbox_id := null;
          action := 'failed';
          dedupe_key := v_dedupe_key;
          match_count := v_user.match_count;
          top_match_id := v_user.id;
          return next;
      end;
    end if;
  end loop;
end;
$$;

create or replace function public.run_want_match_instant_candidate_pass_v1(
  p_limit_users integer default 100,
  p_match_limit_per_user integer default 100,
  p_enqueue_limit integer default 500,
  p_timeout_seconds integer default 25,
  p_dry_run boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start timestamptz := clock_timestamp();
  v_limit_users integer := least(greatest(coalesce(p_limit_users, 100), 1), 500);
  v_match_limit integer := least(greatest(coalesce(p_match_limit_per_user, 100), 1), 1000);
  v_enqueue_limit integer := least(greatest(coalesce(p_enqueue_limit, 500), 1), 1000);
  v_timeout integer := least(greatest(coalesce(p_timeout_seconds, 25), 1), 55);
  v_cursor uuid;
  v_user record;
  v_processed integer := 0;
  v_inserted integer := 0;
  v_seen integer := 0;
  v_enqueued integer := 0;
  v_next_cursor uuid := null;
  v_wrapped boolean := false;
  v_result jsonb;
  v_run_row record;
  v_enqueue_row record;
begin
  insert into public.want_match_job_state (job_name, last_started_at, last_result)
  values ('instant_candidate_pass', now(), '{}'::jsonb)
  on conflict (job_name) do update
  set last_started_at = now()
  returning cursor_user_id into v_cursor;

  for v_user in
    with wanted_users as (
      select distinct user_id from public.wishlist_items
      union
      select distinct user_id
      from public.watches
      where subject_type = 'card'
        and reason = 'want'
        and muted_at is null
    ),
    ordered as (
      select user_id, 0 as pass_order
      from wanted_users
      where v_cursor is null or user_id > v_cursor
      union all
      select user_id, 1 as pass_order
      from wanted_users
      where v_cursor is not null and user_id <= v_cursor
    )
    select user_id
    from ordered
    order by pass_order, user_id
    limit v_limit_users
  loop
    exit when clock_timestamp() > v_start + make_interval(secs => v_timeout);
    v_processed := v_processed + 1;
    v_next_cursor := v_user.user_id;
    if v_cursor is not null and v_user.user_id <= v_cursor then
      v_wrapped := true;
    end if;

    if not p_dry_run then
      begin
        for v_run_row in
          select * from public.run_want_match_engine_v1(v_user.user_id, v_match_limit)
        loop
          if v_run_row.action = 'inserted' then
            v_inserted := v_inserted + 1;
          elsif v_run_row.action = 'seen' then
            v_seen := v_seen + 1;
          end if;
        end loop;
      exception
        when others then
          perform public.want_match_log_delivery_failure_v1(
            'want_match_instant_candidate_pass',
            null,
            v_user.user_id,
            'want_match_engine',
            jsonb_build_object('user_id', v_user.user_id),
            sqlerrm
          );
      end;
    end if;
  end loop;

  if not p_dry_run then
    for v_enqueue_row in
      select * from public.enqueue_want_match_instant_notifications_v1(v_enqueue_limit, false)
    loop
      if v_enqueue_row.action = 'enqueued' then
        v_enqueued := v_enqueued + 1;
      end if;
    end loop;
  end if;

  v_result := jsonb_build_object(
    'dry_run', p_dry_run,
    'processed_users', v_processed,
    'inserted_matches', v_inserted,
    'seen_matches', v_seen,
    'enqueued_instant', v_enqueued,
    'cursor_user_id', v_next_cursor,
    'wrapped', v_wrapped,
    'elapsed_ms', floor(extract(epoch from (clock_timestamp() - v_start)) * 1000)
  );

  if not p_dry_run then
    update public.want_match_job_state
    set cursor_user_id = v_next_cursor,
        last_finished_at = now(),
        last_result = v_result
    where job_name = 'instant_candidate_pass';
  end if;

  return v_result;
exception
  when others then
    perform public.want_match_log_delivery_failure_v1(
      'want_match_instant_candidate_pass',
      null,
      null,
      'want_match_engine',
      jsonb_build_object('dry_run', p_dry_run),
      sqlerrm
    );
    raise;
end;
$$;

create or replace function public.run_want_match_daily_digest_aggregation_v1(
  p_window_date date default current_date,
  p_limit_users integer default 500,
  p_timeout_seconds integer default 25,
  p_dry_run boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start timestamptz := clock_timestamp();
  v_limit_users integer := least(greatest(coalesce(p_limit_users, 500), 1), 1000);
  v_timeout integer := least(greatest(coalesce(p_timeout_seconds, 25), 1), 55);
  v_row record;
  v_enqueued integer := 0;
  v_existing integer := 0;
  v_dry_run integer := 0;
  v_failed integer := 0;
  v_result jsonb;
begin
  insert into public.want_match_job_state (job_name, last_started_at, last_result)
  values ('daily_digest_aggregation', now(), '{}'::jsonb)
  on conflict (job_name) do update
  set last_started_at = now();

  for v_row in
    select * from public.enqueue_want_match_digest_notifications_v1(p_window_date, v_limit_users, p_dry_run)
  loop
    exit when clock_timestamp() > v_start + make_interval(secs => v_timeout);
    if v_row.action = 'enqueued' then
      v_enqueued := v_enqueued + 1;
    elsif v_row.action = 'exists' then
      v_existing := v_existing + 1;
    elsif v_row.action = 'dry_run' then
      v_dry_run := v_dry_run + 1;
    elsif v_row.action = 'failed' then
      v_failed := v_failed + 1;
    end if;
  end loop;

  v_result := jsonb_build_object(
    'dry_run', p_dry_run,
    'window_key', to_char(coalesce(p_window_date, current_date), 'YYYY-MM-DD'),
    'enqueued', v_enqueued,
    'existing', v_existing,
    'dry_run_candidates', v_dry_run,
    'failed', v_failed,
    'elapsed_ms', floor(extract(epoch from (clock_timestamp() - v_start)) * 1000)
  );

  if not p_dry_run then
    update public.want_match_job_state
    set cursor_user_id = null,
        last_finished_at = now(),
        last_result = v_result
    where job_name = 'daily_digest_aggregation';
  end if;

  return v_result;
exception
  when others then
    perform public.want_match_log_delivery_failure_v1(
      'want_match_daily_digest_aggregation',
      null,
      null,
      'want_match_digest',
      jsonb_build_object('dry_run', p_dry_run, 'window_date', p_window_date),
      sqlerrm
    );
    raise;
end;
$$;

create or replace function public.notification_dispatcher_reschedule_digest_fold_v1(
  p_outbox_id uuid,
  p_reason text default 'daily_budget_exhausted',
  p_next_window_at timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_outbox public.notification_outbox%rowtype;
  v_next timestamptz := coalesce(p_next_window_at, date_trunc('day', now() at time zone 'UTC') at time zone 'UTC' + interval '1 day' + interval '9 hours');
begin
  select *
  into v_outbox
  from public.notification_outbox
  where id = p_outbox_id
  for update;

  if not found then
    raise exception 'notification outbox row not found';
  end if;

  if v_outbox.event_type <> 'want_match_digest' then
    raise exception 'not_want_match_digest';
  end if;

  if v_outbox.sent_at is not null or v_outbox.failed_at is not null then
    return;
  end if;

  update public.notification_outbox
  set available_at = greatest(v_next, now() + interval '1 hour'),
      next_attempt_at = greatest(v_next, now() + interval '1 hour'),
      claimed_at = null,
      claim_expires_at = null,
      send_started_at = null,
      folded_into_digest_at = null,
      failure_reason = left(coalesce(nullif(btrim(p_reason), ''), 'daily_budget_exhausted') || '_rescheduled', 1000),
      payload = payload || jsonb_build_object(
        'rescheduled_from_budget_fold_at', now(),
        'reschedule_reason', coalesce(nullif(btrim(p_reason), ''), 'daily_budget_exhausted')
      )
  where id = p_outbox_id;
end;
$$;

revoke all on function public.want_match_log_delivery_failure_v1(text, uuid, uuid, text, jsonb, text) from public, anon, authenticated;
revoke all on function public.enqueue_want_match_instant_notifications_v1(integer, boolean) from public, anon, authenticated;
revoke all on function public.enqueue_want_match_digest_notifications_v1(date, integer, boolean) from public, anon, authenticated;
revoke all on function public.run_want_match_instant_candidate_pass_v1(integer, integer, integer, integer, boolean) from public, anon, authenticated;
revoke all on function public.run_want_match_daily_digest_aggregation_v1(date, integer, integer, boolean) from public, anon, authenticated;
revoke all on function public.notification_dispatcher_reschedule_digest_fold_v1(uuid, text, timestamptz) from public, anon, authenticated;

grant execute on function public.want_match_log_delivery_failure_v1(text, uuid, uuid, text, jsonb, text) to service_role;
grant execute on function public.enqueue_want_match_instant_notifications_v1(integer, boolean) to service_role;
grant execute on function public.enqueue_want_match_digest_notifications_v1(date, integer, boolean) to service_role;
grant execute on function public.run_want_match_instant_candidate_pass_v1(integer, integer, integer, integer, boolean) to service_role;
grant execute on function public.run_want_match_daily_digest_aggregation_v1(date, integer, integer, boolean) to service_role;
grant execute on function public.notification_dispatcher_reschedule_digest_fold_v1(uuid, text, timestamptz) to service_role;

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    perform cron.unschedule(jobid)
    from cron.job
    where jobname in (
      'want-match-instant-every-5-min-v1',
      'want-match-digest-daily-v1'
    );

    perform cron.schedule(
      'want-match-instant-every-5-min-v1',
      '*/5 * * * *',
      'select public.run_want_match_instant_candidate_pass_v1(100, 100, 500, 25, false);'
    );

    perform cron.schedule(
      'want-match-digest-daily-v1',
      '15 14 * * *',
      'select public.run_want_match_daily_digest_aggregation_v1(current_date, 500, 25, false);'
    );
  else
    raise notice 'pg_cron not installed locally; want-match schedule functions installed, cron jobs skipped';
  end if;
exception
  when others then
    raise notice 'want-match cron schedule update skipped: %', sqlerrm;
end;
$$;

commit;
