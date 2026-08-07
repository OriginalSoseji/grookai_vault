begin;

do $$
begin
  if to_regclass('public.user_card_intents') is null
     or to_regclass('public.want_matches') is null
     or to_regclass('public.card_events') is null
     or to_regclass('public.notification_outbox') is null then
    raise exception 'Want Match truth repair requires user_card_intents, want_matches, card_events, and notification_outbox';
  end if;

  if to_regprocedure('public.local_community_visible_source_cards_v1(uuid)') is null
     or to_regprocedure('public.binder_pulse_base_eligible_events_for_viewer_v1(uuid)') is null
     or to_regprocedure('public.mark_stale_want_matches_v1(uuid,integer)') is null
     or to_regprocedure('public.notification_dispatcher_claim_batch_v1(integer)') is null
     or to_regprocedure('public.notification_dispatcher_mark_send_started_v1(uuid)') is null
     or to_regprocedure('public.pulse_jsonb_uuid_v1(text)') is null then
    raise exception 'Want Match truth repair requires the E2/E3/E4/E5 delivery and read contracts';
  end if;
end;
$$;

create or replace function public.viewer_has_current_card_want_v1(
  p_user_id uuid,
  p_card_print_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_user_id is not null
    and p_card_print_id is not null
    and exists (
      select 1
      from public.user_card_intents uci
      where uci.user_id = p_user_id
        and uci.card_print_id = p_card_print_id
        and uci.want is true
    );
$$;

comment on function public.viewer_has_current_card_want_v1(uuid, uuid) is
'Canonical current-want truth boundary. A durable match, Pulse item, or local-community wishlist signal is current only while user_card_intents.want remains true for the exact card_print_id.';

revoke all on function public.viewer_has_current_card_want_v1(uuid, uuid)
from public, anon, authenticated;
grant execute on function public.viewer_has_current_card_want_v1(uuid, uuid)
to service_role;

create or replace function public.notification_outbox_has_current_want_truth_v1(
  p_event_type text,
  p_recipient_user_id uuid,
  p_card_print_id uuid,
  p_payload jsonb
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with normalized as (
    select
      coalesce(p_payload, '{}'::jsonb) as payload,
      case
        when coalesce(p_payload #>> '{counts_by_type,want_match}', '') ~ '^[0-9]+$'
          then (p_payload #>> '{counts_by_type,want_match}')::integer
        else 0
      end as pulse_want_count,
      case
        when coalesce(p_payload ->> 'match_count', '') ~ '^[0-9]+$'
          then (p_payload ->> 'match_count')::integer
        else 0
      end as legacy_digest_match_count
  ),
  pulse_items as (
    select item.value
    from normalized n
    cross join lateral jsonb_array_elements(
      case
        when jsonb_typeof(n.payload -> 'compact_item_ids') = 'array'
          then n.payload -> 'compact_item_ids'
        else '[]'::jsonb
      end
    ) item(value)
  ),
  pulse_refs as (
    select public.pulse_jsonb_uuid_v1(item.value ->> 'want_match_id') as want_match_id
    from pulse_items item
    where public.pulse_jsonb_uuid_v1(item.value ->> 'want_match_id') is not null
    union all
    select public.pulse_jsonb_uuid_v1(ce.payload ->> 'want_match_id') as want_match_id
    from pulse_items item
    join public.card_events ce
      on ce.id = public.pulse_jsonb_uuid_v1(item.value ->> 'card_event_id')
     and ce.event_type = 'want_match_available'
    where public.pulse_jsonb_uuid_v1(ce.payload ->> 'want_match_id') is not null
  ),
  legacy_digest_refs as (
    select public.pulse_jsonb_uuid_v1(item.value) as want_match_id
    from normalized n
    cross join lateral jsonb_array_elements_text(
      case
        when jsonb_typeof(n.payload -> 'compact_match_ids') = 'array'
          then n.payload -> 'compact_match_ids'
        else '[]'::jsonb
      end
    ) item(value)
    where public.pulse_jsonb_uuid_v1(item.value) is not null
  ),
  relevant_refs as (
    select want_match_id from pulse_refs where p_event_type = 'pulse_daily'
    union all
    select want_match_id from legacy_digest_refs where p_event_type = 'want_match_digest'
  ),
  ref_truth as (
    select
      count(*)::integer as reference_count,
      count(*) filter (
        where wm.id is null
           or wm.want_user_id is distinct from p_recipient_user_id
           or wm.status is distinct from 'active'
           or not public.viewer_has_current_card_want_v1(
             p_recipient_user_id,
             wm.card_print_id
           )
      )::integer as invalid_reference_count
    from relevant_refs refs
    left join public.want_matches wm on wm.id = refs.want_match_id
  )
  select case
    when p_event_type = 'want_match_available' then exists (
      select 1
      from public.want_matches wm
      where wm.id = public.pulse_jsonb_uuid_v1(
          coalesce(p_payload, '{}'::jsonb) ->> 'want_match_id'
        )
        and wm.want_user_id = p_recipient_user_id
        and wm.card_print_id = p_card_print_id
        and wm.status = 'active'
        and public.viewer_has_current_card_want_v1(
          p_recipient_user_id,
          wm.card_print_id
        )
    )
    when p_event_type = 'pulse_daily'
         and (select pulse_want_count from normalized) > 0 then
      (select reference_count from ref_truth) =
        (select pulse_want_count from normalized)
      and (select invalid_reference_count from ref_truth) = 0
    when p_event_type = 'want_match_digest' then
      (select legacy_digest_match_count from normalized) > 0
      and (select reference_count from ref_truth) =
        (select legacy_digest_match_count from normalized)
      and (select invalid_reference_count from ref_truth) = 0
    else true
  end;
$$;

comment on function public.notification_outbox_has_current_want_truth_v1(text, uuid, uuid, jsonb) is
'Final delivery evidence gate for Want Match instant and digest-bearing outbox rows. Every represented durable match must remain active and backed by the recipient current exact-card want; incomplete compact evidence fails closed.';

revoke all on function public.notification_outbox_has_current_want_truth_v1(text, uuid, uuid, jsonb)
from public, anon, authenticated;
grant execute on function public.notification_outbox_has_current_want_truth_v1(text, uuid, uuid, jsonb)
to service_role;

create or replace function public.enforce_current_want_match_activation_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_want boolean;
begin
  if new.status <> 'active' then
    return new;
  end if;

  select uci.want
  into v_current_want
  from public.user_card_intents uci
  where uci.user_id = new.want_user_id
    and uci.card_print_id = new.card_print_id
  for update;

  if not found or v_current_want is not true then
    update public.want_matches wm
    set status = 'stale',
        stale_marked_at = coalesce(wm.stale_marked_at, now()),
        payload = wm.payload || jsonb_build_object(
          'stale_reason', 'activation_without_current_want',
          'stale_policy_version', 'WANT_MATCH_CURRENT_WANT_TRUTH_V1'
        )
    where wm.id = new.id
      and wm.status = 'active';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_current_want_match_activation_v1
on public.want_matches;
create trigger trg_enforce_current_want_match_activation_v1
after insert or update of status on public.want_matches
for each row execute function public.enforce_current_want_match_activation_v1();

comment on function public.enforce_current_want_match_activation_v1() is
'Serializes every active Want Match insert/reactivation against the exact user_card_intents row. Unsupported activation is converted to retained stale history before the transaction commits.';

revoke all on function public.enforce_current_want_match_activation_v1()
from public, anon, authenticated;

-- Preserve the existing source-card implementation, then replace its exposed
-- wishlist boolean with the same current-want predicate used by the app.
alter function public.local_community_visible_source_cards_v1(uuid)
rename to legacy_local_community_visible_source_cards_v1;

create or replace function public.local_community_visible_source_cards_v1(
  p_viewer_user_id uuid
)
returns table (
  source_type text,
  owner_user_id uuid,
  owner_slug text,
  owner_display_name text,
  owner_avatar_path text,
  card_print_id uuid,
  gv_id text,
  card_name text,
  set_code text,
  set_name text,
  card_number text,
  intent text,
  image_url text,
  display_image_kind text,
  locality_label text,
  distance_bucket text,
  relationship_context text,
  viewer_wishlist_match boolean,
  created_at timestamptz,
  route_target text,
  vault_item_id uuid,
  instance_id uuid,
  score double precision,
  match_strength double precision,
  recommended_tier text,
  dedupe_key text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    src.source_type,
    src.owner_user_id,
    src.owner_slug,
    src.owner_display_name,
    src.owner_avatar_path,
    src.card_print_id,
    src.gv_id,
    src.card_name,
    src.set_code,
    src.set_name,
    src.card_number,
    src.intent,
    src.image_url,
    src.display_image_kind,
    src.locality_label,
    src.distance_bucket,
    src.relationship_context,
    public.viewer_has_current_card_want_v1(
      p_viewer_user_id,
      src.card_print_id
    ) as viewer_wishlist_match,
    src.created_at,
    src.route_target,
    src.vault_item_id,
    src.instance_id,
    src.score,
    src.match_strength,
    src.recommended_tier,
    src.dedupe_key
  from public.legacy_local_community_visible_source_cards_v1(
    p_viewer_user_id
  ) src;
$$;

comment on function public.local_community_visible_source_cards_v1(uuid) is
'Current-want truth wrapper around the preserved E5 local-community source implementation. viewer_wishlist_match is derived only from user_card_intents.want for the exact card print.';

revoke all on function public.legacy_local_community_visible_source_cards_v1(uuid)
from public, anon, authenticated;
revoke all on function public.local_community_visible_source_cards_v1(uuid)
from public, anon, authenticated;

create or replace function public.stale_want_matches_when_intent_removed_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_should_stale boolean := false;
begin
  if tg_op = 'DELETE' then
    v_should_stale := old.want is true;
  elsif tg_op = 'UPDATE' then
    v_should_stale := old.want is true and (
      new.want is not true
      or new.user_id is distinct from old.user_id
      or new.card_print_id is distinct from old.card_print_id
    );
  end if;

  if v_should_stale then
    update public.want_matches wm
    set status = 'stale',
        stale_marked_at = coalesce(wm.stale_marked_at, now()),
        payload = wm.payload || jsonb_build_object(
          'stale_reason', 'canonical_want_removed',
          'stale_policy_version', 'WANT_MATCH_CURRENT_WANT_TRUTH_V1'
        )
    where wm.want_user_id = old.user_id
      and wm.card_print_id = old.card_print_id
      and wm.status = 'active';

    update public.notification_outbox outbox
    set failed_at = now(),
        failure_reason = 'cancelled_current_want_removed',
        claimed_at = null,
        claim_expires_at = null
    where outbox.recipient_user_id = old.user_id
      and outbox.sent_at is null
      and outbox.folded_into_digest_at is null
      and outbox.failed_at is null
      and outbox.send_started_at is null
      and (
        (
          outbox.event_type = 'want_match_available'
          and outbox.card_print_id = old.card_print_id
        )
        or outbox.event_type = any (
          array['want_match_digest'::text, 'pulse_daily'::text]
        )
      );
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_stale_want_matches_when_intent_removed_v1
on public.user_card_intents;
create trigger trg_stale_want_matches_when_intent_removed_v1
after update or delete on public.user_card_intents
for each row execute function public.stale_want_matches_when_intent_removed_v1();

comment on function public.stale_want_matches_when_intent_removed_v1() is
'Immediately marks active durable matches stale when the exact canonical want is turned off, deleted, or moved. Match and event history is retained.';

revoke all on function public.stale_want_matches_when_intent_removed_v1()
from public, anon, authenticated;

create or replace function public.notification_dispatcher_claim_batch_v1(
  p_limit integer default 25
)
returns setof public.notification_outbox
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notification_outbox outbox
  set failed_at = now(),
      failure_reason = 'cancelled_current_want_not_supported',
      claimed_at = null,
      claim_expires_at = null
  where outbox.sent_at is null
    and outbox.failed_at is null
    and outbox.folded_into_digest_at is null
    and outbox.send_started_at is null
    and outbox.event_type = any (
      array[
        'want_match_available'::text,
        'want_match_digest'::text,
        'pulse_daily'::text
      ]
    )
    and not public.notification_outbox_has_current_want_truth_v1(
      outbox.event_type,
      outbox.recipient_user_id,
      outbox.card_print_id,
      outbox.payload
    );

  return query
  with candidate_rows as (
    select outbox.id
    from public.notification_outbox outbox
    where outbox.sent_at is null
      and outbox.failed_at is null
      and outbox.folded_into_digest_at is null
      and outbox.available_at <= now()
      and outbox.next_attempt_at <= now()
      and public.notification_outbox_has_current_want_truth_v1(
        outbox.event_type,
        outbox.recipient_user_id,
        outbox.card_print_id,
        outbox.payload
      )
      and (
        outbox.claimed_at is null
        or (
          outbox.claim_expires_at < now()
          and outbox.send_started_at is null
        )
      )
    order by outbox.available_at asc, outbox.created_at asc
    limit greatest(1, least(coalesce(p_limit, 25), 100))
    for update skip locked
  )
  update public.notification_outbox outbox
  set claimed_at = now(),
      claim_expires_at = now() + interval '5 minutes',
      attempts = outbox.attempts + 1
  from candidate_rows candidates
  where outbox.id = candidates.id
  returning outbox.*;
end;
$$;

comment on function public.notification_dispatcher_claim_batch_v1(integer) is
'Claims only current delivery evidence. Unsupported Want Match instant and digest-bearing rows are terminally cancelled before dispatch.';

revoke all on function public.notification_dispatcher_claim_batch_v1(integer)
from public, anon, authenticated;
grant execute on function public.notification_dispatcher_claim_batch_v1(integer)
to service_role;

create or replace function public.notification_dispatcher_mark_send_started_if_current_v1(
  p_outbox_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_outbox public.notification_outbox%rowtype;
  v_card_print_id uuid;
begin
  -- Read routing fields first without taking an outbox lock. Intent writes take
  -- their row lock before the opt-out trigger touches outbox rows, so the send
  -- boundary must use that same intent -> outbox lock order.
  select *
  into v_outbox
  from public.notification_outbox
  where id = p_outbox_id;

  if not found
     or v_outbox.sent_at is not null
     or v_outbox.failed_at is not null
     or v_outbox.folded_into_digest_at is not null
     or v_outbox.send_started_at is not null then
    return false;
  end if;

  if v_outbox.event_type = 'want_match_available' then
    perform 1
    from public.user_card_intents uci
    where uci.user_id = v_outbox.recipient_user_id
      and uci.card_print_id = v_outbox.card_print_id
    for update;
  elsif v_outbox.event_type = any (
    array['want_match_digest'::text, 'pulse_daily'::text]
  ) then
    for v_card_print_id in
      with pulse_items as (
        select item.value
        from jsonb_array_elements(
          case
            when jsonb_typeof(v_outbox.payload -> 'compact_item_ids') = 'array'
              then v_outbox.payload -> 'compact_item_ids'
            else '[]'::jsonb
          end
        ) item(value)
      ),
      referenced_matches as (
        select public.pulse_jsonb_uuid_v1(item.value ->> 'want_match_id') as want_match_id
        from pulse_items item
        where public.pulse_jsonb_uuid_v1(item.value ->> 'want_match_id') is not null
        union
        select public.pulse_jsonb_uuid_v1(ce.payload ->> 'want_match_id') as want_match_id
        from pulse_items item
        join public.card_events ce
          on ce.id = public.pulse_jsonb_uuid_v1(item.value ->> 'card_event_id')
         and ce.event_type = 'want_match_available'
        where public.pulse_jsonb_uuid_v1(ce.payload ->> 'want_match_id') is not null
        union
        select public.pulse_jsonb_uuid_v1(item.value) as want_match_id
        from jsonb_array_elements_text(
          case
            when jsonb_typeof(v_outbox.payload -> 'compact_match_ids') = 'array'
              then v_outbox.payload -> 'compact_match_ids'
            else '[]'::jsonb
          end
        ) item(value)
        where public.pulse_jsonb_uuid_v1(item.value) is not null
      )
      select distinct wm.card_print_id
      from referenced_matches refs
      join public.want_matches wm on wm.id = refs.want_match_id
      where wm.want_user_id = v_outbox.recipient_user_id
      order by wm.card_print_id
    loop
      perform 1
      from public.user_card_intents uci
      where uci.user_id = v_outbox.recipient_user_id
        and uci.card_print_id = v_card_print_id
      for update;
    end loop;
  end if;

  select *
  into v_outbox
  from public.notification_outbox
  where id = p_outbox_id
  for update;

  if not found
     or v_outbox.sent_at is not null
     or v_outbox.failed_at is not null
     or v_outbox.folded_into_digest_at is not null
     or v_outbox.send_started_at is not null then
    return false;
  end if;

  if not public.notification_outbox_has_current_want_truth_v1(
    v_outbox.event_type,
    v_outbox.recipient_user_id,
    v_outbox.card_print_id,
    v_outbox.payload
  ) then
    update public.notification_outbox
    set failed_at = now(),
        failure_reason = 'cancelled_current_want_not_supported',
        claimed_at = null,
        claim_expires_at = null
    where id = p_outbox_id;
    return false;
  end if;

  update public.notification_outbox
  set send_started_at = coalesce(send_started_at, now())
  where id = p_outbox_id;

  return true;
end;
$$;

comment on function public.notification_dispatcher_mark_send_started_if_current_v1(uuid) is
'Atomic final pre-FCM gate. Locks the outbox row, rechecks current Want Match evidence, and starts delivery only when that evidence still holds.';

revoke all on function public.notification_dispatcher_mark_send_started_if_current_v1(uuid)
from public, anon, authenticated;
grant execute on function public.notification_dispatcher_mark_send_started_if_current_v1(uuid)
to service_role;

-- The Binder migration preserved the original card/watch Pulse function under
-- this name. Wrap it so every Pulse consumer, including unread and mark-seen,
-- excludes a Want Match that is not backed by a current exact-card want.
alter function public.binder_pulse_base_eligible_events_for_viewer_v1(uuid)
rename to legacy_binder_pulse_base_eligible_events_v1;

create or replace function public.binder_pulse_base_eligible_events_for_viewer_v1(
  p_viewer_user_id uuid
)
returns table (
  card_event_id uuid,
  event_type text,
  rank_bucket text,
  bucket_rank integer,
  created_at timestamptz,
  actor_user_id uuid,
  actor_slug text,
  actor_display_name text,
  actor_avatar_path text,
  subject_user_id uuid,
  subject_slug text,
  subject_display_name text,
  card_print_id uuid,
  gv_id text,
  card_name text,
  set_code text,
  set_name text,
  card_number text,
  display_image_url text,
  display_image_kind text,
  ownership_context text,
  distance_bucket text,
  locality_label text,
  value_delta_amount numeric,
  value_delta_percent numeric,
  completion_subject_type text,
  completion_subject_label text,
  completion_threshold numeric,
  primary_action text,
  primary_action_label text,
  primary_action_route text,
  payload jsonb,
  visibility text,
  watch_subject_type text,
  watch_subject_id uuid,
  watch_strength double precision
)
language sql
stable
security definer
set search_path = public
as $$
  select eligible.*
  from public.legacy_binder_pulse_base_eligible_events_v1(
    p_viewer_user_id
  ) eligible
  where eligible.event_type <> 'want_match_available'
     or exists (
       select 1
       from public.want_matches wm
       where wm.id = public.pulse_jsonb_uuid_v1(
           eligible.payload ->> 'want_match_id'
         )
         and wm.want_user_id = p_viewer_user_id
         and wm.card_print_id = eligible.card_print_id
         and wm.status = 'active'
         and public.viewer_has_current_card_want_v1(
           p_viewer_user_id,
           wm.card_print_id
         )
     );
$$;

comment on function public.binder_pulse_base_eligible_events_for_viewer_v1(uuid) is
'Pulse current-want truth wrapper. Historical Want Match events remain stored but are ineligible when the durable match is not active or the exact canonical want no longer exists.';

revoke all on function public.legacy_binder_pulse_base_eligible_events_v1(uuid)
from public, anon, authenticated;
revoke all on function public.binder_pulse_base_eligible_events_for_viewer_v1(uuid)
from public, anon, authenticated;
grant execute on function public.binder_pulse_base_eligible_events_for_viewer_v1(uuid)
to service_role;

-- Repair current drift without deleting any durable match or event rows.
update public.want_matches wm
set status = 'stale',
    stale_marked_at = coalesce(wm.stale_marked_at, now()),
    payload = wm.payload || jsonb_build_object(
      'stale_reason', 'canonical_want_not_current_at_truth_repair',
      'stale_policy_version', 'WANT_MATCH_CURRENT_WANT_TRUTH_V1'
    )
where wm.status = 'active'
  and not public.viewer_has_current_card_want_v1(
    wm.want_user_id,
    wm.card_print_id
  );

-- Cancel any pre-existing unsent alert whose current evidence was invalidated
-- by the status repair. Daily rows are cancelled as one immutable payload so
-- their counts and top-card copy cannot retain an opted-out match.
update public.notification_outbox outbox
set failed_at = now(),
    failure_reason = 'cancelled_current_want_not_supported',
    claimed_at = null,
    claim_expires_at = null
where outbox.sent_at is null
  and outbox.folded_into_digest_at is null
  and outbox.failed_at is null
  and outbox.send_started_at is null
  and outbox.event_type = any (
    array[
      'want_match_available'::text,
      'want_match_digest'::text,
      'pulse_daily'::text
    ]
  )
  and not public.notification_outbox_has_current_want_truth_v1(
    outbox.event_type,
    outbox.recipient_user_id,
    outbox.card_print_id,
    outbox.payload
  );

-- Existing cleanup covers owner-side availability changes after its seven-day
-- grace period. Schedule it as defense in depth; opt-outs are synchronous.
do $$
declare
  v_job_id bigint;
begin
  if to_regclass('cron.job') is not null then
    for v_job_id in
      select jobid
      from cron.job
      where jobname = 'grookai-want-match-stale-cleanup-v1'
    loop
      perform cron.unschedule(v_job_id);
    end loop;

    perform cron.schedule(
      'grookai-want-match-stale-cleanup-v1',
      '*/15 * * * *',
      'select count(*) from public.mark_stale_want_matches_v1(null, 1000);'
    );
  end if;
end;
$$;

commit;
