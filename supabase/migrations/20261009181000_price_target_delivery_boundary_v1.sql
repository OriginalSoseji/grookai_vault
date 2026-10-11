begin;
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

  if v_outbox.event_type = 'price_target_reached' then
    -- Same control -> target -> outbox order as the evaluator. Serialize with
    -- explicit pause/revision writes through the final delivery-start boundary.
    perform 1 from public.price_target_control where evaluate_enabled for share;
    if not found then return false; end if;
    perform 1 from public.price_targets t
      join public.price_target_events e on e.target_id=t.id
      where e.outbox_id=p_outbox_id for update of t;
  elsif v_outbox.event_type = 'want_match_available' then
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

  if v_outbox.event_type = 'price_target_reached'
     and not public.price_target_delivery_allowed_v1(p_outbox_id) then
    update public.notification_outbox
    set failed_at=now(),failure_reason='cancelled_price_target_changed',
        claimed_at=null,claim_expires_at=null where id=p_outbox_id;
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
'Atomic final pre-FCM gate. Serializes target revisions and current Want Match evidence before starting delivery.';

revoke all on function public.notification_dispatcher_mark_send_started_if_current_v1(uuid)
from public, anon, authenticated;
grant execute on function public.notification_dispatcher_mark_send_started_if_current_v1(uuid)
to service_role;

commit;
