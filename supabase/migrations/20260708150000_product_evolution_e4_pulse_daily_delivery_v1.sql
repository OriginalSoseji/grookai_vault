begin;

create table if not exists public.pulse_daily_job_state (
  job_name text primary key,
  cursor_user_id uuid null references auth.users(id) on delete set null,
  last_window_key text null,
  last_started_at timestamptz null,
  last_finished_at timestamptz null,
  last_result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pulse_daily_job_state_job_name_nonempty_check
    check (btrim(job_name) <> ''),
  constraint pulse_daily_job_state_result_object_check
    check (jsonb_typeof(last_result) = 'object')
);

comment on table public.pulse_daily_job_state is
'E4 service-role job cursor for daily Pulse aggregation. No client access.';

drop trigger if exists trg_pulse_daily_job_state_updated_at on public.pulse_daily_job_state;
create trigger trg_pulse_daily_job_state_updated_at
before update on public.pulse_daily_job_state
for each row
execute function public.set_timestamp_updated_at();

alter table public.pulse_daily_job_state enable row level security;

revoke all on table public.pulse_daily_job_state from public, anon, authenticated;
grant all on table public.pulse_daily_job_state to service_role;

drop policy if exists pulse_daily_job_state_service_role_all on public.pulse_daily_job_state;
create policy pulse_daily_job_state_service_role_all
on public.pulse_daily_job_state
for all
to service_role
using (true)
with check (true);

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
begin
  -- E4 cutover: daily digest-tier want matches are now folded into
  -- pulse_daily. Keep this function as a no-op compatibility surface so
  -- manual or stale scheduled calls cannot create standalone
  -- want_match_digest rows.
  return;
end;
$$;

comment on function public.enqueue_want_match_digest_notifications_v1(date, integer, boolean) is
'E4 cutover no-op. Standalone want_match_digest rows are superseded by pulse_daily aggregation.';

create or replace function public.skip_undelivered_want_match_digest_for_pulse_daily_v1(
  p_reason text default 'superseded_by_pulse_daily'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_count integer := 0;
  v_reason text := left(coalesce(nullif(btrim(p_reason), ''), 'superseded_by_pulse_daily'), 1000);
begin
  for v_row in
    select id
    from public.notification_outbox
    where event_type = 'want_match_digest'
      and sent_at is null
      and folded_into_digest_at is null
      and failed_at is null
    order by created_at asc, id asc
  loop
    perform public.notification_dispatcher_mark_skipped_v1(
      v_row.id,
      'Grookai Vault',
      'Want-list digest was superseded by Pulse.',
      'grookai://feed?segment=pulse',
      v_reason
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

comment on function public.skip_undelivered_want_match_digest_for_pulse_daily_v1(text) is
'E4 cutover helper. Marks undelivered legacy want_match_digest rows skipped instead of draining them.';

create or replace function public.enqueue_pulse_daily_notifications_v1(
  p_window_date date default current_date,
  p_limit_users integer default 500,
  p_dry_run boolean default false,
  p_after_user_id uuid default null
)
returns table (
  recipient_user_id uuid,
  outbox_id uuid,
  action text,
  dedupe_key text,
  item_count integer,
  top_card_print_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user record;
  v_limit integer := least(greatest(coalesce(p_limit_users, 500), 1), 1000);
  v_window_date date := coalesce(p_window_date, current_date);
  v_window_key text := to_char(coalesce(p_window_date, current_date), 'YYYY-MM-DD');
  v_window_start timestamptz := (coalesce(p_window_date, current_date)::timestamp at time zone 'UTC');
  v_window_end timestamptz := ((coalesce(p_window_date, current_date)::timestamp + interval '1 day') at time zone 'UTC');
  v_dedupe_key text;
  v_outbox_id uuid;
begin
  for v_user in
    with candidate_users as (
      select distinct w.user_id
      from public.watches w
      where w.muted_at is null
      union
      select distinct wm.want_user_id as user_id
      from public.want_matches wm
      where wm.status = 'active'
        and wm.recommended_tier = 'digest'
    ),
    bounded_users as (
      select candidate_users.user_id
      from candidate_users
      where p_after_user_id is null or candidate_users.user_id > p_after_user_id
      order by candidate_users.user_id
      limit v_limit
    ),
    pulse_items as (
      select
        bu.user_id as recipient_user_id,
        p.card_event_id,
        null::uuid as want_match_id,
        p.rank_bucket,
        p.card_print_id,
        p.actor_user_id,
        p.gv_id,
        p.card_name,
        p.set_code,
        p.card_number,
        p.display_image_url,
        p.distance_bucket,
        p.locality_label,
        p.created_at,
        case p.rank_bucket
          when 'want_match' then 1
          when 'collector_activity' then 2
          when 'value_move' then 3
          when 'completion' then 4
          else 99
        end as bucket_rank,
        coalesce((p.payload ->> 'match_strength')::double precision, p.watch_strength, 0.5) as strength
      from bounded_users bu
      cross join lateral public.pulse_eligible_events_for_viewer_v1(bu.user_id) p
      where p.card_print_id is not null
        and p.created_at >= v_window_start
        and p.created_at < v_window_end
    ),
    digest_items as (
      select
        wm.want_user_id as recipient_user_id,
        null::uuid as card_event_id,
        wm.id as want_match_id,
        'want_match'::text as rank_bucket,
        wm.card_print_id,
        wm.owner_user_id as actor_user_id,
        cp.gv_id,
        cp.name as card_name,
        cp.set_code,
        cp.number as card_number,
        coalesce(wm.payload ->> 'display_image_url', cp.image_url, cp.image_alt_url) as display_image_url,
        wm.distance_bucket,
        wm.locality_label,
        wm.last_seen_available_at as created_at,
        1 as bucket_rank,
        wm.match_strength as strength
      from bounded_users bu
      join public.want_matches wm
        on wm.want_user_id = bu.user_id
      join public.card_prints cp
        on cp.id = wm.card_print_id
      where wm.status = 'active'
        and wm.recommended_tier = 'digest'
    ),
    merged_items as (
      select * from pulse_items
      union all
      select * from digest_items
    ),
    ranked_items as (
      select
        merged_items.*,
        row_number() over (
          partition by merged_items.recipient_user_id
          order by
            merged_items.bucket_rank,
            merged_items.strength desc,
            merged_items.created_at desc,
            coalesce(merged_items.card_event_id, merged_items.want_match_id) desc
        ) as item_rank
      from merged_items
    ),
    rollups as (
      select
        ranked_counts.recipient_user_id,
        count(*)::integer as item_count,
        jsonb_object_agg(ranked_counts.rank_bucket, ranked_counts.bucket_count) as counts_by_type
      from (
        select
          ranked_items.recipient_user_id,
          ranked_items.rank_bucket,
          count(*)::integer as bucket_count
        from ranked_items
        group by ranked_items.recipient_user_id, ranked_items.rank_bucket
      ) ranked_counts
      group by ranked_counts.recipient_user_id
    ),
    compact_ids as (
      select
        ranked_items.recipient_user_id,
        jsonb_agg(
          jsonb_strip_nulls(jsonb_build_object(
            'card_event_id', ranked_items.card_event_id,
            'want_match_id', ranked_items.want_match_id,
            'rank_bucket', ranked_items.rank_bucket,
            'card_print_id', ranked_items.card_print_id
          ))
          order by ranked_items.item_rank
        ) filter (where ranked_items.item_rank <= 10) as compact_item_ids
      from ranked_items
      group by ranked_items.recipient_user_id
    ),
    top_items as (
      select *
      from ranked_items
      where item_rank = 1
    )
    select
      top_items.*,
      rollups.item_count,
      rollups.counts_by_type,
      compact_ids.compact_item_ids
    from top_items
    join rollups on rollups.recipient_user_id = top_items.recipient_user_id
    join compact_ids on compact_ids.recipient_user_id = top_items.recipient_user_id
    where not exists (
      select 1
      from public.notification_outbox o
      where o.recipient_user_id = top_items.recipient_user_id
        and o.dedupe_key = 'pulse_daily:' || top_items.recipient_user_id::text || ':' || v_window_key
    )
    order by top_items.recipient_user_id
  loop
    v_dedupe_key := 'pulse_daily:' || v_user.recipient_user_id::text || ':' || v_window_key;

    if p_dry_run then
      recipient_user_id := v_user.recipient_user_id;
      outbox_id := null;
      action := 'dry_run';
      dedupe_key := v_dedupe_key;
      item_count := v_user.item_count;
      top_card_print_id := v_user.card_print_id;
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
          v_user.recipient_user_id,
          'pulse_daily',
          'daily_pulse',
          v_user.card_print_id,
          v_user.actor_user_id,
          v_user.card_event_id,
          jsonb_strip_nulls(jsonb_build_object(
            'window_key', v_window_key,
            'item_count', v_user.item_count,
            'counts_by_type', v_user.counts_by_type,
            'top_item', jsonb_build_object(
              'card_event_id', v_user.card_event_id,
              'want_match_id', v_user.want_match_id,
              'rank_bucket', v_user.rank_bucket
            ),
            'top_card', jsonb_build_object(
              'card_print_id', v_user.card_print_id,
              'gv_id', v_user.gv_id,
              'name', v_user.card_name,
              'set_code', v_user.set_code,
              'number', v_user.card_number,
              'image_url', v_user.display_image_url
            ),
            'compact_item_ids', coalesce(v_user.compact_item_ids, '[]'::jsonb),
            'distance_bucket', v_user.distance_bucket,
            'locality_label', v_user.locality_label,
            'top_card_name', v_user.card_name,
            'route', 'grookai://feed?segment=pulse',
            'top_card_context_gv_id', v_user.gv_id
          )),
          v_dedupe_key
        )
        on conflict do nothing
        returning id into v_outbox_id;

        recipient_user_id := v_user.recipient_user_id;
        outbox_id := v_outbox_id;
        action := case when v_outbox_id is null then 'exists' else 'enqueued' end;
        dedupe_key := v_dedupe_key;
        item_count := v_user.item_count;
        top_card_print_id := v_user.card_print_id;
        return next;
      exception
        when others then
          perform public.notification_log_emit_failure_v1(
            'pulse_daily_enqueue',
            null,
            v_user.recipient_user_id,
            'pulse_daily',
            jsonb_build_object('dedupe_key', v_dedupe_key, 'window_key', v_window_key),
            sqlerrm
          );
          recipient_user_id := v_user.recipient_user_id;
          outbox_id := null;
          action := 'failed';
          dedupe_key := v_dedupe_key;
          item_count := v_user.item_count;
          top_card_print_id := v_user.card_print_id;
          return next;
      end;
    end if;
  end loop;
end;
$$;

comment on function public.enqueue_pulse_daily_notifications_v1(date, integer, boolean, uuid) is
'E4 Pulse daily enqueue. Creates at most one pulse_daily outbox row per user/window when real Pulse items or digest-tier want matches exist.';

create or replace function public.run_pulse_daily_aggregation_v1(
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
  v_limit integer := least(greatest(coalesce(p_limit_users, 500), 1), 1000);
  v_timeout integer := least(greatest(coalesce(p_timeout_seconds, 25), 1), 55);
  v_window_key text := to_char(coalesce(p_window_date, current_date), 'YYYY-MM-DD');
  v_cursor uuid;
  v_row record;
  v_enqueued integer := 0;
  v_existing integer := 0;
  v_dry_run integer := 0;
  v_failed integer := 0;
  v_skipped_legacy integer := 0;
  v_next_cursor uuid := null;
  v_result jsonb;
begin
  insert into public.pulse_daily_job_state (job_name, last_window_key, last_started_at, last_result)
  values ('pulse_daily_aggregation', v_window_key, now(), '{}'::jsonb)
  on conflict (job_name) do update
  set last_window_key = excluded.last_window_key,
      last_started_at = now()
  returning cursor_user_id into v_cursor;

  if not p_dry_run then
    v_skipped_legacy := public.skip_undelivered_want_match_digest_for_pulse_daily_v1('superseded_by_pulse_daily');
  end if;

  for v_row in
    select * from public.enqueue_pulse_daily_notifications_v1(p_window_date, v_limit, p_dry_run, v_cursor)
  loop
    exit when clock_timestamp() > v_start + make_interval(secs => v_timeout);
    v_next_cursor := v_row.recipient_user_id;
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
    'window_key', v_window_key,
    'enqueued', v_enqueued,
    'existing', v_existing,
    'dry_run_candidates', v_dry_run,
    'failed', v_failed,
    'skipped_legacy_want_match_digest', v_skipped_legacy,
    'cursor_user_id', v_next_cursor,
    'elapsed_ms', floor(extract(epoch from (clock_timestamp() - v_start)) * 1000)
  );

  if not p_dry_run then
    update public.pulse_daily_job_state
    set cursor_user_id = v_next_cursor,
        last_finished_at = now(),
        last_result = v_result
    where job_name = 'pulse_daily_aggregation';
  end if;

  return v_result;
exception
  when others then
    perform public.notification_log_emit_failure_v1(
      'pulse_daily_aggregation',
      null,
      null,
      'pulse_daily',
      jsonb_build_object('dry_run', p_dry_run, 'window_date', p_window_date),
      sqlerrm
    );
    raise;
end;
$$;

comment on function public.run_pulse_daily_aggregation_v1(date, integer, integer, boolean) is
'E4 scheduled Pulse daily aggregation. Also performs the skip-not-drain cutover for legacy want_match_digest rows.';

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

  if v_outbox.event_type <> all (array['want_match_digest'::text, 'pulse_daily'::text]) then
    raise exception 'not_reschedulable_daily_pulse';
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

comment on function public.notification_dispatcher_reschedule_digest_fold_v1(uuid, text, timestamptz) is
'E4-compatible daily pulse fold rescheduler. Supports legacy want_match_digest and new pulse_daily rows.';

revoke all on function public.enqueue_want_match_digest_notifications_v1(date, integer, boolean) from public, anon, authenticated;
revoke all on function public.skip_undelivered_want_match_digest_for_pulse_daily_v1(text) from public, anon, authenticated;
revoke all on function public.enqueue_pulse_daily_notifications_v1(date, integer, boolean, uuid) from public, anon, authenticated;
revoke all on function public.run_pulse_daily_aggregation_v1(date, integer, integer, boolean) from public, anon, authenticated;
revoke all on function public.notification_dispatcher_reschedule_digest_fold_v1(uuid, text, timestamptz) from public, anon, authenticated;

grant execute on function public.enqueue_want_match_digest_notifications_v1(date, integer, boolean) to service_role;
grant execute on function public.skip_undelivered_want_match_digest_for_pulse_daily_v1(text) to service_role;
grant execute on function public.enqueue_pulse_daily_notifications_v1(date, integer, boolean, uuid) to service_role;
grant execute on function public.run_pulse_daily_aggregation_v1(date, integer, integer, boolean) to service_role;
grant execute on function public.notification_dispatcher_reschedule_digest_fold_v1(uuid, text, timestamptz) to service_role;

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    perform cron.unschedule(jobid)
    from cron.job
    where jobname in (
      'want-match-digest-daily-v1',
      'pulse-daily-aggregation-v1'
    );

    perform cron.schedule(
      'pulse-daily-aggregation-v1',
      '15 14 * * *',
      'select public.run_pulse_daily_aggregation_v1(current_date, 500, 25, false);'
    );
  else
    raise notice 'pg_cron not installed locally; pulse daily schedule function installed, cron job skipped';
  end if;
exception
  when others then
    raise notice 'pulse daily cron schedule update skipped: %', sqlerrm;
end;
$$;

commit;
