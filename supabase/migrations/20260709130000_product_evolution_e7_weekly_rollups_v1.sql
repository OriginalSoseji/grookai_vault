begin;

create table if not exists public.north_star_weekly_rollups (
  week_start date primary key,
  week_end date not null,
  generated_at timestamptz not null default now(),
  source_window_start timestamptz not null,
  source_window_end timestamptz not null,
  wau_count integer not null,
  meaningful_interaction_count integer not null,
  meaningful_interactions_per_wau numeric(12,4) not null,
  active_unmuted_watches_count integer not null,
  watches_per_wau numeric(12,4) not null,
  watch_matched_event_count integer not null,
  events_per_watch numeric(12,4) not null,
  ladder_started_count integer not null,
  ladder_owned_count integer not null,
  ladder_wanted_count integer not null,
  ladder_followed_count integer not null,
  ladder_completed_count integer not null,
  input_row_counts jsonb not null default '{}'::jsonb,
  constraint north_star_weekly_rollups_monday_check check (extract(isodow from week_start) = 1),
  constraint north_star_weekly_rollups_window_check check (week_end = week_start + 7)
);

comment on table public.north_star_weekly_rollups is
'E7 founder-only weekly north-star metrics. Derived from existing durable behavioral tables; does not drive product behavior.';

create table if not exists public.north_star_weekly_breakdowns (
  id uuid primary key default gen_random_uuid(),
  week_start date not null references public.north_star_weekly_rollups(week_start) on delete cascade,
  metric_name text not null,
  dimension_name text not null,
  dimension_value text not null,
  metric_value numeric(16,4) not null,
  row_count integer null,
  created_at timestamptz not null default now(),
  constraint north_star_weekly_breakdowns_metric_nonempty_check check (btrim(metric_name) <> ''),
  constraint north_star_weekly_breakdowns_dimension_name_nonempty_check check (btrim(dimension_name) <> ''),
  constraint north_star_weekly_breakdowns_dimension_value_nonempty_check check (btrim(dimension_value) <> '')
);

comment on table public.north_star_weekly_breakdowns is
'E7 founder-only dimensional weekly metric rows for dashboard panels. No raw message text or per-user drilldown.';

create unique index if not exists north_star_weekly_breakdowns_unique_idx
  on public.north_star_weekly_breakdowns (week_start, metric_name, dimension_name, dimension_value);

create table if not exists public.notification_type_delivery_recommendations (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  event_type text not null,
  tier text not null,
  sent_count integer not null,
  tap_count integer not null,
  tap_through_rate numeric(8,4) not null,
  recommendation text not null check (recommendation in ('none', 'digest_only_candidate')),
  threshold numeric(8,4) not null,
  reason text not null,
  requires_founder_approval boolean not null default true,
  founder_approved_at timestamptz null,
  founder_approved_by_user_id uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint notification_type_delivery_recommendations_event_type_nonempty_check check (btrim(event_type) <> ''),
  constraint notification_type_delivery_recommendations_tier_nonempty_check check (btrim(tier) <> ''),
  constraint notification_type_delivery_recommendations_counts_check check (sent_count >= 0 and tap_count >= 0 and tap_count <= sent_count)
);

comment on table public.notification_type_delivery_recommendations is
'E7 advisory-only founder review flags. Dispatcher ignores these rows in E7.';

create unique index if not exists notification_type_delivery_recommendations_unique_idx
  on public.notification_type_delivery_recommendations (week_start, event_type, tier);

alter table public.north_star_weekly_rollups enable row level security;
alter table public.north_star_weekly_breakdowns enable row level security;
alter table public.notification_type_delivery_recommendations enable row level security;

revoke all on table public.north_star_weekly_rollups from public, anon, authenticated;
revoke all on table public.north_star_weekly_breakdowns from public, anon, authenticated;
revoke all on table public.notification_type_delivery_recommendations from public, anon, authenticated;

grant all on table public.north_star_weekly_rollups to service_role;
grant all on table public.north_star_weekly_breakdowns to service_role;
grant all on table public.notification_type_delivery_recommendations to service_role;

drop policy if exists north_star_weekly_rollups_service_role_all on public.north_star_weekly_rollups;
create policy north_star_weekly_rollups_service_role_all
on public.north_star_weekly_rollups
for all
to service_role
using (true)
with check (true);

drop policy if exists north_star_weekly_breakdowns_service_role_all on public.north_star_weekly_breakdowns;
create policy north_star_weekly_breakdowns_service_role_all
on public.north_star_weekly_breakdowns
for all
to service_role
using (true)
with check (true);

drop policy if exists notification_type_delivery_recommendations_service_role_all on public.notification_type_delivery_recommendations;
create policy notification_type_delivery_recommendations_service_role_all
on public.notification_type_delivery_recommendations
for all
to service_role
using (true)
with check (true);

create or replace function public.run_north_star_weekly_rollup_v1(
  p_week_start date,
  p_dry_run boolean default true
)
returns table (
  entity text,
  action text,
  row_key text,
  payload jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_week_start date := p_week_start;
  v_week_end date := p_week_start + 7;
  v_window_start timestamptz := (p_week_start::timestamp at time zone 'UTC');
  v_window_end timestamptz := ((p_week_start + 7)::timestamp at time zone 'UTC');
  v_rollup public.north_star_weekly_rollups%rowtype;
begin
  if v_week_start is null then
    raise exception 'week_start_required' using errcode = '22023';
  end if;

  if extract(isodow from v_week_start) <> 1 then
    raise exception 'week_start_must_be_monday:%', v_week_start using errcode = '22023';
  end if;

  with
  meaningful as (
    select *
    from public.v_meaningful_interactions_v1
    where occurred_at >= v_window_start
      and occurred_at < v_window_end
  ),
  active_users as (
    select actor_user_id as user_id
    from public.card_events
    where created_at >= v_window_start and created_at < v_window_end and actor_user_id is not null
    union
    select subject_user_id
    from public.card_events
    where created_at >= v_window_start and created_at < v_window_end and subject_user_id is not null
    union
    select sender_user_id
    from public.card_interactions
    where created_at >= v_window_start and created_at < v_window_end and sender_user_id is not null
    union
    select receiver_user_id
    from public.card_interactions
    where created_at >= v_window_start and created_at < v_window_end and receiver_user_id is not null
    union
    select recipient_user_id
    from public.notifications_log
    where tapped_at >= v_window_start and tapped_at < v_window_end and recipient_user_id is not null
    union
    select user_id
    from public.onboarding_ladder_events
    where created_at >= v_window_start and created_at < v_window_end and user_id is not null
  ),
  watch_counts as (
    select
      count(*)::integer as active_unmuted_watches_count
    from public.watches
    where muted_at is null
  ),
  watch_matched as (
    select count(*)::integer as watch_matched_event_count
    from meaningful m
    where exists (
      select 1
      from public.watches w
      where w.user_id = coalesce(m.actor_user_id, m.subject_user_id)
        and w.subject_type = 'card'
        and w.subject_id = m.card_print_id
        and w.muted_at is null
    )
  ),
  ladder as (
    select
      count(distinct user_id) filter (where event_type in ('rung_1_owned', 'rung_1_wanted', 'rung_2_followed', 'loop_promise_shown'))::integer as ladder_started_count,
      count(distinct user_id) filter (where event_type = 'rung_1_owned')::integer as ladder_owned_count,
      count(distinct user_id) filter (where event_type = 'rung_1_wanted')::integer as ladder_wanted_count,
      count(distinct user_id) filter (where event_type = 'rung_2_followed')::integer as ladder_followed_count,
      count(distinct user_id) filter (where event_type in ('rung_3_first_message', 'rung_3_first_match_acted'))::integer as ladder_completed_count
    from public.onboarding_ladder_events
    where created_at >= v_window_start
      and created_at < v_window_end
  ),
  input_counts as (
    select jsonb_build_object(
      'meaningful_interactions', (select count(*) from meaningful),
      'card_events', (select count(*) from public.card_events where created_at >= v_window_start and created_at < v_window_end),
      'card_interactions', (select count(*) from public.card_interactions where created_at >= v_window_start and created_at < v_window_end),
      'notification_taps', (select count(*) from public.notifications_log where tapped_at >= v_window_start and tapped_at < v_window_end),
      'onboarding_ladder_events', (select count(*) from public.onboarding_ladder_events where created_at >= v_window_start and created_at < v_window_end),
      'active_unmuted_watches', (select active_unmuted_watches_count from watch_counts)
    ) as input_payload
  )
  select
    v_week_start,
    v_week_end,
    now(),
    v_window_start,
    v_window_end,
    (select count(distinct user_id)::integer from active_users),
    (select count(*)::integer from meaningful),
    coalesce(round(((select count(*)::numeric from meaningful) / nullif((select count(distinct user_id)::numeric from active_users), 0)), 4), 0),
    (select active_unmuted_watches_count from watch_counts),
    coalesce(round(((select active_unmuted_watches_count::numeric from watch_counts) / nullif((select count(distinct user_id)::numeric from active_users), 0)), 4), 0),
    (select watch_matched_event_count from watch_matched),
    coalesce(round(((select watch_matched_event_count::numeric from watch_matched) / nullif((select active_unmuted_watches_count::numeric from watch_counts), 0)), 4), 0),
    coalesce((select ladder_started_count from ladder), 0),
    coalesce((select ladder_owned_count from ladder), 0),
    coalesce((select ladder_wanted_count from ladder), 0),
    coalesce((select ladder_followed_count from ladder), 0),
    coalesce((select ladder_completed_count from ladder), 0),
    (select input_payload from input_counts)
  into v_rollup;

  create temporary table if not exists pg_temp.e7_rollup_breakdowns (
    metric_name text,
    dimension_name text,
    dimension_value text,
    metric_value numeric(16,4),
    row_count integer
  ) on commit drop;
  truncate table pg_temp.e7_rollup_breakdowns;

  insert into pg_temp.e7_rollup_breakdowns (metric_name, dimension_name, dimension_value, metric_value, row_count)
  select 'meaningful_interactions', 'kind', kind::text, count(*)::numeric, count(*)::integer
  from public.v_meaningful_interactions_v1
  where occurred_at >= v_window_start and occurred_at < v_window_end
  group by kind;

  insert into pg_temp.e7_rollup_breakdowns (metric_name, dimension_name, dimension_value, metric_value, row_count)
  select 'notification_tap_through', 'event_type', event_type, coalesce(round(count(*) filter (where tapped_at is not null)::numeric / nullif(count(*)::numeric, 0), 4), 0), count(*)::integer
  from public.notifications_log
  where sent_at >= v_window_start
    and sent_at < v_window_end
    and send_status = 'sent'
  group by event_type;

  insert into pg_temp.e7_rollup_breakdowns (metric_name, dimension_name, dimension_value, metric_value, row_count)
  select 'notification_tap_through', 'tier', tier, coalesce(round(count(*) filter (where tapped_at is not null)::numeric / nullif(count(*)::numeric, 0), 4), 0), count(*)::integer
  from public.notifications_log
  where sent_at >= v_window_start
    and sent_at < v_window_end
    and send_status = 'sent'
  group by tier;

  insert into pg_temp.e7_rollup_breakdowns (metric_name, dimension_name, dimension_value, metric_value, row_count)
  select 'onboarding_ladder_conversion', 'rung', event_type, count(distinct user_id)::numeric, count(*)::integer
  from public.onboarding_ladder_events
  where created_at >= v_window_start
    and created_at < v_window_end
  group by event_type;

  insert into pg_temp.e7_rollup_breakdowns (metric_name, dimension_name, dimension_value, metric_value, row_count)
  select 'watches', 'subject_type', subject_type, count(*)::numeric, count(*)::integer
  from public.watches
  where muted_at is null
  group by subject_type;

  create temporary table if not exists pg_temp.e7_recommendations (
    week_start date,
    event_type text,
    tier text,
    sent_count integer,
    tap_count integer,
    tap_through_rate numeric(8,4),
    recommendation text,
    threshold numeric(8,4),
    reason text
  ) on commit drop;
  truncate table pg_temp.e7_recommendations;

  insert into pg_temp.e7_recommendations (
    week_start, event_type, tier, sent_count, tap_count, tap_through_rate, recommendation, threshold, reason
  )
  with
  current_week as (
    select
      event_type,
      tier,
      count(*)::integer as sent_count,
      count(*) filter (where tapped_at is not null)::integer as tap_count,
      coalesce(round(count(*) filter (where tapped_at is not null)::numeric / nullif(count(*)::numeric, 0), 4), 0)::numeric(8,4) as tap_through_rate
    from public.notifications_log
    where sent_at >= v_window_start
      and sent_at < v_window_end
      and send_status = 'sent'
    group by event_type, tier
  ),
  previous_week as (
    select
      event_type,
      tier,
      count(*)::integer as sent_count,
      count(*) filter (where tapped_at is not null)::integer as tap_count,
      coalesce(round(count(*) filter (where tapped_at is not null)::numeric / nullif(count(*)::numeric, 0), 4), 0)::numeric(8,4) as tap_through_rate
    from public.notifications_log
    where sent_at >= (v_window_start - interval '7 days')
      and sent_at < v_window_start
      and send_status = 'sent'
    group by event_type, tier
  )
  select
    v_week_start,
    c.event_type,
    c.tier,
    c.sent_count,
    c.tap_count,
    c.tap_through_rate,
    case
      when c.tier = 'instant'
       and c.sent_count >= 20
       and c.tap_through_rate < 0.0600
       and coalesce(p.sent_count, 0) >= 20
       and coalesce(p.tap_through_rate, 1) < 0.0600
      then 'digest_only_candidate'
      else 'none'
    end,
    0.0600,
    case
      when c.tier = 'instant'
       and c.sent_count >= 20
       and c.tap_through_rate < 0.0600
       and coalesce(p.sent_count, 0) >= 20
       and coalesce(p.tap_through_rate, 1) < 0.0600
      then 'Instant notification type was below 6% tap-through for two consecutive completed weeks with at least 20 sends per week. Founder review required; dispatcher behavior unchanged.'
      else 'No E7 advisory action.'
    end
  from current_week c
  left join previous_week p
    on p.event_type = c.event_type
   and p.tier = c.tier;

  if not coalesce(p_dry_run, true) then
    insert into public.north_star_weekly_rollups (
      week_start, week_end, generated_at, source_window_start, source_window_end,
      wau_count, meaningful_interaction_count, meaningful_interactions_per_wau,
      active_unmuted_watches_count, watches_per_wau, watch_matched_event_count,
      events_per_watch, ladder_started_count, ladder_owned_count, ladder_wanted_count,
      ladder_followed_count, ladder_completed_count, input_row_counts
    )
    values (
      v_rollup.week_start, v_rollup.week_end, now(), v_rollup.source_window_start, v_rollup.source_window_end,
      v_rollup.wau_count, v_rollup.meaningful_interaction_count, v_rollup.meaningful_interactions_per_wau,
      v_rollup.active_unmuted_watches_count, v_rollup.watches_per_wau, v_rollup.watch_matched_event_count,
      v_rollup.events_per_watch, v_rollup.ladder_started_count, v_rollup.ladder_owned_count, v_rollup.ladder_wanted_count,
      v_rollup.ladder_followed_count, v_rollup.ladder_completed_count, v_rollup.input_row_counts
    )
    on conflict (week_start) do update set
      week_end = excluded.week_end,
      generated_at = now(),
      source_window_start = excluded.source_window_start,
      source_window_end = excluded.source_window_end,
      wau_count = excluded.wau_count,
      meaningful_interaction_count = excluded.meaningful_interaction_count,
      meaningful_interactions_per_wau = excluded.meaningful_interactions_per_wau,
      active_unmuted_watches_count = excluded.active_unmuted_watches_count,
      watches_per_wau = excluded.watches_per_wau,
      watch_matched_event_count = excluded.watch_matched_event_count,
      events_per_watch = excluded.events_per_watch,
      ladder_started_count = excluded.ladder_started_count,
      ladder_owned_count = excluded.ladder_owned_count,
      ladder_wanted_count = excluded.ladder_wanted_count,
      ladder_followed_count = excluded.ladder_followed_count,
      ladder_completed_count = excluded.ladder_completed_count,
      input_row_counts = excluded.input_row_counts;

    delete from public.north_star_weekly_breakdowns where week_start = v_week_start;
    insert into public.north_star_weekly_breakdowns (
      week_start, metric_name, dimension_name, dimension_value, metric_value, row_count
    )
    select v_week_start, metric_name, dimension_name, dimension_value, metric_value, row_count
    from pg_temp.e7_rollup_breakdowns;

    insert into public.notification_type_delivery_recommendations (
      week_start, event_type, tier, sent_count, tap_count, tap_through_rate,
      recommendation, threshold, reason
    )
    select
      week_start, event_type, tier, sent_count, tap_count, tap_through_rate,
      recommendation, threshold, reason
    from pg_temp.e7_recommendations
    on conflict (week_start, event_type, tier) do update set
      sent_count = excluded.sent_count,
      tap_count = excluded.tap_count,
      tap_through_rate = excluded.tap_through_rate,
      recommendation = excluded.recommendation,
      threshold = excluded.threshold,
      reason = excluded.reason;
  end if;

  return query
  select
    'north_star_weekly_rollups'::text,
    case when coalesce(p_dry_run, true) then 'would_upsert' else 'upserted' end,
    v_rollup.week_start::text,
    to_jsonb(v_rollup)
  union all
  select
    'north_star_weekly_breakdowns',
    case when coalesce(p_dry_run, true) then 'would_replace' else 'replaced' end,
    metric_name || ':' || dimension_name || ':' || dimension_value,
    jsonb_build_object(
      'week_start', v_week_start,
      'metric_name', metric_name,
      'dimension_name', dimension_name,
      'dimension_value', dimension_value,
      'metric_value', metric_value,
      'row_count', row_count
    )
  from pg_temp.e7_rollup_breakdowns
  union all
  select
    'notification_type_delivery_recommendations',
    case when coalesce(p_dry_run, true) then 'would_upsert' else 'upserted' end,
    event_type || ':' || tier,
    jsonb_build_object(
      'week_start', week_start,
      'event_type', event_type,
      'tier', tier,
      'sent_count', sent_count,
      'tap_count', tap_count,
      'tap_through_rate', tap_through_rate,
      'recommendation', recommendation,
      'threshold', threshold,
      'reason', reason
    )
  from pg_temp.e7_recommendations;
end;
$$;

comment on function public.run_north_star_weekly_rollup_v1(date, boolean) is
'E7 service-role weekly rollup generator. Dry-run returns rows that would be written. Apply mode writes only E7 rollup, breakdown, and advisory recommendation tables. Weekly pg_cron/pg_net scheduling is intentionally disabled until founder approval.';

revoke all on function public.run_north_star_weekly_rollup_v1(date, boolean) from public, anon, authenticated;
grant execute on function public.run_north_star_weekly_rollup_v1(date, boolean) to service_role;

commit;
