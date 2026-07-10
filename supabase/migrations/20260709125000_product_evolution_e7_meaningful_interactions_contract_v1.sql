begin;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'meaningful_interaction_kind'
  ) then
    create type public.meaningful_interaction_kind as enum (
      'message_about_card',
      'trade_intent_expressed',
      'trade_intent_answered',
      'want_match_acted_on',
      'wall_follow'
    );
  end if;
end;
$$;

comment on type public.meaningful_interaction_kind is
'E7 north-star source of truth. Only these card-anchored interaction kinds count as meaningful interactions.';

create or replace view public.v_meaningful_interactions_v1 as
with
want_match_message_actions as (
  select distinct on (wm.id)
    wm.id as want_match_id,
    ci.id as source_id,
    'card_interactions'::text as source_table,
    ci.sender_user_id as actor_user_id,
    ci.receiver_user_id as subject_user_id,
    ci.card_print_id,
    ci.created_at as occurred_at,
    jsonb_build_object(
      'want_match_id', wm.id,
      'source', 'card_interaction',
      'owner_user_id', wm.owner_user_id,
      'want_user_id', wm.want_user_id,
      'distance_bucket', wm.distance_bucket,
      'recommended_tier', wm.recommended_tier
    ) as payload
  from public.want_matches wm
  join public.card_interactions ci
    on ci.sender_user_id = wm.want_user_id
   and ci.receiver_user_id = wm.owner_user_id
   and ci.card_print_id = wm.card_print_id
   and ci.created_at >= wm.first_seen_available_at
  order by wm.id, ci.created_at, ci.id
),
want_match_tap_actions as (
  select distinct on (wm.id)
    wm.id as want_match_id,
    nl.id as source_id,
    'notifications_log'::text as source_table,
    wm.want_user_id as actor_user_id,
    wm.owner_user_id as subject_user_id,
    wm.card_print_id,
    nl.tapped_at as occurred_at,
    jsonb_build_object(
      'want_match_id', wm.id,
      'source', 'notification_tap',
      'notification_event_type', nl.event_type,
      'outbox_id', nl.outbox_id,
      'owner_user_id', wm.owner_user_id,
      'want_user_id', wm.want_user_id,
      'distance_bucket', wm.distance_bucket,
      'recommended_tier', wm.recommended_tier
    ) as payload
  from public.want_matches wm
  join public.notifications_log nl
    on nl.recipient_user_id = wm.want_user_id
   and nl.card_print_id = wm.card_print_id
   and nl.event_type = any (array['want_match_available'::text, 'want_match_digest'::text])
   and nl.tapped_at is not null
   and nl.tapped_at >= wm.first_seen_available_at
  order by wm.id, nl.tapped_at, nl.id
),
want_match_actions as (
  select distinct on (want_match_id)
    want_match_id,
    source_id,
    source_table,
    actor_user_id,
    subject_user_id,
    card_print_id,
    occurred_at,
    payload
  from (
    select * from want_match_message_actions
    union all
    select * from want_match_tap_actions
  ) actions
  order by want_match_id, occurred_at, source_table, source_id
),
threaded_card_interactions as (
  select
    ci.*,
    row_number() over (
      partition by
        ci.card_print_id,
        least(ci.sender_user_id::text, ci.receiver_user_id::text),
        greatest(ci.sender_user_id::text, ci.receiver_user_id::text)
      order by ci.created_at, ci.id
    ) as thread_position
  from public.card_interactions ci
  where not exists (
    select 1
    from want_match_actions wma
    where wma.source_table = 'card_interactions'
      and wma.source_id = ci.id
  )
),
meaningful_rows as (
  select
    'collector_follows:' || cf.id::text || ':wall_follow' as interaction_id,
    'wall_follow'::public.meaningful_interaction_kind as kind,
    cf.follower_user_id as actor_user_id,
    cf.followed_user_id as subject_user_id,
    null::uuid as card_print_id,
    'collector_follows'::text as source_table,
    cf.id as source_id,
    cf.created_at as occurred_at,
    jsonb_build_object(
      'follower_user_id', cf.follower_user_id,
      'followed_user_id', cf.followed_user_id
    ) as payload
  from public.collector_follows cf

  union all

  select
    'card_events:' || ce.id::text || ':trade_intent_expressed' as interaction_id,
    'trade_intent_expressed'::public.meaningful_interaction_kind as kind,
    ce.actor_user_id,
    ce.subject_user_id,
    ce.card_print_id,
    'card_events'::text as source_table,
    ce.id as source_id,
    ce.created_at as occurred_at,
    jsonb_build_object(
      'card_event_id', ce.id,
      'previous_intent', ce.payload ->> 'previous_intent',
      'next_intent', ce.payload ->> 'next_intent',
      'vault_item_instance_id', ce.payload ->> 'vault_item_instance_id',
      'gvvi_id', ce.payload ->> 'gvvi_id'
    ) as payload
  from public.card_events ce
  where ce.event_type = 'vault_intent_changed'
    and ce.card_print_id is not null
    and lower(coalesce(ce.payload ->> 'next_intent', '')) = any (array['trade'::text, 'sell'::text])

  union all

  select
    'card_interactions:' || ci.id::text || ':message_about_card' as interaction_id,
    'message_about_card'::public.meaningful_interaction_kind as kind,
    ci.sender_user_id as actor_user_id,
    ci.receiver_user_id as subject_user_id,
    ci.card_print_id,
    'card_interactions'::text as source_table,
    ci.id as source_id,
    ci.created_at as occurred_at,
    jsonb_build_object(
      'card_interaction_id', ci.id,
      'vault_item_id', ci.vault_item_id,
      'thread_position', ci.thread_position
    ) as payload
  from threaded_card_interactions ci
  where ci.thread_position = 1

  union all

  select
    'card_interactions:' || ci.id::text || ':trade_intent_answered' as interaction_id,
    'trade_intent_answered'::public.meaningful_interaction_kind as kind,
    ci.sender_user_id as actor_user_id,
    ci.receiver_user_id as subject_user_id,
    ci.card_print_id,
    'card_interactions'::text as source_table,
    ci.id as source_id,
    ci.created_at as occurred_at,
    jsonb_build_object(
      'card_interaction_id', ci.id,
      'vault_item_id', ci.vault_item_id,
      'vault_item_intent', vi.intent,
      'thread_position', ci.thread_position
    ) as payload
  from threaded_card_interactions ci
  join public.vault_items vi
    on vi.id = ci.vault_item_id
  where ci.thread_position = 2
    and vi.intent = any (array['trade'::text, 'sell'::text])

  union all

  select
    wma.source_table || ':' || wma.source_id::text || ':want_match_acted_on' as interaction_id,
    'want_match_acted_on'::public.meaningful_interaction_kind as kind,
    wma.actor_user_id,
    wma.subject_user_id,
    wma.card_print_id,
    wma.source_table,
    wma.source_id,
    wma.occurred_at,
    wma.payload
  from want_match_actions wma
)
select
  interaction_id,
  kind,
  actor_user_id,
  subject_user_id,
  card_print_id,
  source_table,
  source_id,
  occurred_at,
  payload
from meaningful_rows;

comment on view public.v_meaningful_interactions_v1 is
'E7 founder/service-only mapping of durable source rows to the one shared meaningful interaction enum. Threaded card_interactions are exclusive: the opening card message counts as message_about_card, the first reply on a trade/sell target counts as trade_intent_answered, showcase-only replies and third-plus replies count as neither. Want-match action rows are removed from message/reply metrics before threading so one source row maps to at most one kind.';

revoke all on public.v_meaningful_interactions_v1 from anon;
revoke all on public.v_meaningful_interactions_v1 from authenticated;
grant select on public.v_meaningful_interactions_v1 to service_role;

commit;
