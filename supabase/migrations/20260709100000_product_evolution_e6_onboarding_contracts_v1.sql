begin;

create table if not exists public.onboarding_ladder_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  owned_completed_at timestamptz null,
  owned_card_print_id uuid null references public.card_prints(id) on delete set null,
  owned_source text null,
  wanted_completed_at timestamptz null,
  wanted_card_print_id uuid null references public.card_prints(id) on delete set null,
  wanted_source text null,
  loop_promise_shown_at timestamptz null,
  suggestions_shown_at timestamptz null,
  first_followed_at timestamptz null,
  first_followed_user_id uuid null references auth.users(id) on delete set null,
  first_pulse_with_item_at timestamptz null,
  first_message_at timestamptz null,
  first_match_acted_at timestamptz null,
  skipped_at timestamptz null,
  dismissed_forever_at timestamptz null,
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint onboarding_ladder_state_owned_source_check
    check (owned_source is null or owned_source = any (array['scan'::text, 'search'::text, 'manual_existing'::text])),
  constraint onboarding_ladder_state_wanted_source_check
    check (wanted_source is null or wanted_source = any (array['search'::text, 'set_browse'::text, 'manual_existing'::text]))
);

comment on table public.onboarding_ladder_state is
'E6 private per-user retention-ladder state. Owner-only; updated through security-definer RPCs.';

create index if not exists onboarding_ladder_state_incomplete_idx
  on public.onboarding_ladder_state (completed_at, dismissed_forever_at)
  where completed_at is null and dismissed_forever_at is null;

drop trigger if exists trg_onboarding_ladder_state_updated_at on public.onboarding_ladder_state;
create trigger trg_onboarding_ladder_state_updated_at
before update on public.onboarding_ladder_state
for each row
execute function public.set_timestamp_updated_at();

create table if not exists public.onboarding_ladder_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  card_print_id uuid null references public.card_prints(id) on delete set null,
  collector_user_id uuid null references auth.users(id) on delete set null,
  source text null,
  payload jsonb not null default '{}'::jsonb,
  dedupe_key text null,
  created_at timestamptz not null default now(),
  constraint onboarding_ladder_events_event_type_check
    check (event_type = any (array[
      'rung_1_owned'::text,
      'rung_1_wanted'::text,
      'rung_2_followed'::text,
      'rung_2_first_pulse_with_item'::text,
      'rung_3_first_message'::text,
      'rung_3_first_match_acted'::text,
      'onboarding_skipped'::text,
      'onboarding_dismissed'::text,
      'loop_promise_shown'::text,
      'collector_suggestions_shown'::text
    ])),
  constraint onboarding_ladder_events_payload_object_check
    check (jsonb_typeof(payload) = 'object'),
  constraint onboarding_ladder_events_dedupe_key_nonempty_check
    check (dedupe_key is null or btrim(dedupe_key) <> '')
);

comment on table public.onboarding_ladder_events is
'E6 append-only private rung event log for retention-ladder conversion measurement.';

create index if not exists onboarding_ladder_events_user_created_idx
  on public.onboarding_ladder_events (user_id, created_at desc, id desc);

create index if not exists onboarding_ladder_events_type_created_idx
  on public.onboarding_ladder_events (event_type, created_at desc, id desc);

create unique index if not exists onboarding_ladder_events_dedupe_key_unique_idx
  on public.onboarding_ladder_events (dedupe_key)
  where dedupe_key is not null;

create or replace function public.onboarding_ladder_events_block_mutation_v1()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'onboarding_ladder_events is append-only' using errcode = 'P0001';
end;
$$;

drop trigger if exists trg_onboarding_ladder_events_block_update on public.onboarding_ladder_events;
create trigger trg_onboarding_ladder_events_block_update
before update on public.onboarding_ladder_events
for each row execute function public.onboarding_ladder_events_block_mutation_v1();

drop trigger if exists trg_onboarding_ladder_events_block_delete on public.onboarding_ladder_events;
create trigger trg_onboarding_ladder_events_block_delete
before delete on public.onboarding_ladder_events
for each row execute function public.onboarding_ladder_events_block_mutation_v1();

alter table public.onboarding_ladder_state enable row level security;
alter table public.onboarding_ladder_events enable row level security;

revoke all on table public.onboarding_ladder_state from public, anon, authenticated;
revoke all on table public.onboarding_ladder_events from public, anon, authenticated;

grant select on table public.onboarding_ladder_state to authenticated;
grant select on table public.onboarding_ladder_events to authenticated;

drop policy if exists onboarding_ladder_state_owner_select on public.onboarding_ladder_state;
create policy onboarding_ladder_state_owner_select
on public.onboarding_ladder_state
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists onboarding_ladder_events_owner_select on public.onboarding_ladder_events;
create policy onboarding_ladder_events_owner_select
on public.onboarding_ladder_events
for select
to authenticated
using (user_id = auth.uid());

create or replace function public.onboarding_ladder_bootstrap_state_v1(
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owned_card_print_id uuid;
  v_owned_created_at timestamptz;
  v_wanted_card_print_id uuid;
  v_wanted_created_at timestamptz;
  v_followed_user_id uuid;
  v_followed_created_at timestamptz;
begin
  if p_user_id is null then
    raise exception 'user_required' using errcode = '22023';
  end if;

  insert into public.onboarding_ladder_state (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select vii.card_print_id, vii.created_at
    into v_owned_card_print_id, v_owned_created_at
  from public.vault_item_instances vii
  where vii.user_id = p_user_id
    and vii.card_print_id is not null
    and vii.archived_at is null
  order by vii.created_at asc, vii.id asc
  limit 1;

  if v_owned_card_print_id is not null then
    update public.onboarding_ladder_state
    set
      owned_completed_at = coalesce(owned_completed_at, coalesce(v_owned_created_at, now())),
      owned_card_print_id = coalesce(owned_card_print_id, v_owned_card_print_id),
      owned_source = coalesce(owned_source, 'manual_existing')
    where user_id = p_user_id;
  end if;

  select wi.card_id, wi.created_at
    into v_wanted_card_print_id, v_wanted_created_at
  from public.wishlist_items wi
  where wi.user_id = p_user_id
  order by wi.created_at asc, wi.id asc
  limit 1;

  if v_wanted_card_print_id is not null then
    update public.onboarding_ladder_state
    set
      wanted_completed_at = coalesce(wanted_completed_at, coalesce(v_wanted_created_at, now())),
      wanted_card_print_id = coalesce(wanted_card_print_id, v_wanted_card_print_id),
      wanted_source = coalesce(wanted_source, 'manual_existing')
    where user_id = p_user_id;
  end if;

  select cf.followed_user_id, cf.created_at
    into v_followed_user_id, v_followed_created_at
  from public.collector_follows cf
  where cf.follower_user_id = p_user_id
  order by cf.created_at asc, cf.id asc
  limit 1;

  if v_followed_user_id is not null then
    update public.onboarding_ladder_state
    set
      first_followed_at = coalesce(first_followed_at, coalesce(v_followed_created_at, now())),
      first_followed_user_id = coalesce(first_followed_user_id, v_followed_user_id)
    where user_id = p_user_id;
  end if;

  update public.onboarding_ladder_state
  set completed_at = coalesce(completed_at, now())
  where user_id = p_user_id
    and completed_at is null
    and owned_completed_at is not null
    and wanted_completed_at is not null
    and (first_followed_at is not null or skipped_at is not null);
end;
$$;

revoke all on function public.onboarding_ladder_bootstrap_state_v1(uuid) from public, anon, authenticated;

create or replace function public.onboarding_ladder_state_v1()
returns table (
  user_id uuid,
  owned_completed_at timestamptz,
  owned_card_print_id uuid,
  owned_source text,
  wanted_completed_at timestamptz,
  wanted_card_print_id uuid,
  wanted_source text,
  loop_promise_shown_at timestamptz,
  suggestions_shown_at timestamptz,
  first_followed_at timestamptz,
  first_followed_user_id uuid,
  first_pulse_with_item_at timestamptz,
  first_message_at timestamptz,
  first_match_acted_at timestamptz,
  skipped_at timestamptz,
  dismissed_forever_at timestamptz,
  completed_at timestamptz,
  needs_owned boolean,
  needs_wanted boolean,
  should_show_loop_promise boolean,
  should_show_collector_suggestions boolean,
  is_complete boolean,
  is_dismissed boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  perform public.onboarding_ladder_bootstrap_state_v1(v_uid);

  return query
  select
    s.user_id,
    s.owned_completed_at,
    s.owned_card_print_id,
    s.owned_source,
    s.wanted_completed_at,
    s.wanted_card_print_id,
    s.wanted_source,
    s.loop_promise_shown_at,
    s.suggestions_shown_at,
    s.first_followed_at,
    s.first_followed_user_id,
    s.first_pulse_with_item_at,
    s.first_message_at,
    s.first_match_acted_at,
    s.skipped_at,
    s.dismissed_forever_at,
    s.completed_at,
    (s.owned_completed_at is null) as needs_owned,
    (s.wanted_completed_at is null) as needs_wanted,
    (
      s.owned_completed_at is not null
      and s.wanted_completed_at is not null
      and s.loop_promise_shown_at is null
      and s.dismissed_forever_at is null
    ) as should_show_loop_promise,
    (
      s.owned_completed_at is not null
      and s.wanted_completed_at is not null
      and s.first_followed_at is null
      and s.skipped_at is null
      and s.dismissed_forever_at is null
    ) as should_show_collector_suggestions,
    (s.completed_at is not null) as is_complete,
    (s.dismissed_forever_at is not null) as is_dismissed
  from public.onboarding_ladder_state s
  where s.user_id = v_uid;
end;
$$;

create or replace function public.onboarding_record_rung_v1(
  p_event_type text,
  p_card_print_id uuid default null,
  p_collector_user_id uuid default null,
  p_source text default null,
  p_payload jsonb default '{}'::jsonb
)
returns table (
  user_id uuid,
  owned_completed_at timestamptz,
  owned_card_print_id uuid,
  owned_source text,
  wanted_completed_at timestamptz,
  wanted_card_print_id uuid,
  wanted_source text,
  loop_promise_shown_at timestamptz,
  suggestions_shown_at timestamptz,
  first_followed_at timestamptz,
  first_followed_user_id uuid,
  first_pulse_with_item_at timestamptz,
  first_message_at timestamptz,
  first_match_acted_at timestamptz,
  skipped_at timestamptz,
  dismissed_forever_at timestamptz,
  completed_at timestamptz,
  needs_owned boolean,
  needs_wanted boolean,
  should_show_loop_promise boolean,
  should_show_collector_suggestions boolean,
  is_complete boolean,
  is_dismissed boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_event_type text := nullif(btrim(coalesce(p_event_type, '')), '');
  v_source text := nullif(btrim(coalesce(p_source, '')), '');
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_dedupe_key text;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if v_event_type is null then
    raise exception 'event_type_required' using errcode = '22023';
  end if;
  if jsonb_typeof(v_payload) <> 'object' then
    raise exception 'payload_must_be_object' using errcode = '22023';
  end if;
  if v_event_type not in (
    'rung_1_owned',
    'rung_1_wanted',
    'rung_2_followed',
    'rung_2_first_pulse_with_item',
    'rung_3_first_message',
    'rung_3_first_match_acted',
    'loop_promise_shown',
    'collector_suggestions_shown'
  ) then
    raise exception 'unsupported_onboarding_event_type:%', v_event_type using errcode = '22023';
  end if;

  if v_event_type in ('rung_1_owned', 'rung_1_wanted', 'rung_2_first_pulse_with_item', 'rung_3_first_match_acted')
     and p_card_print_id is null then
    raise exception 'card_print_id_required' using errcode = '22023';
  end if;

  if v_event_type = 'rung_1_wanted'
     and not exists (
       select 1 from public.wishlist_items wi
       where wi.user_id = v_uid
         and wi.card_id = p_card_print_id
     ) then
    raise exception 'canonical_wishlist_item_required' using errcode = '22023';
  end if;

  if v_event_type = 'rung_2_followed' then
    if p_collector_user_id is null then
      raise exception 'collector_user_id_required' using errcode = '22023';
    end if;
    if not exists (
      select 1 from public.collector_follows cf
      where cf.follower_user_id = v_uid
        and cf.followed_user_id = p_collector_user_id
    ) then
      raise exception 'collector_follow_required' using errcode = '22023';
    end if;
  end if;

  perform public.onboarding_ladder_bootstrap_state_v1(v_uid);

  v_dedupe_key := concat_ws(
    ':',
    'onboarding',
    v_event_type,
    v_uid::text,
    coalesce(p_card_print_id::text, ''),
    coalesce(p_collector_user_id::text, '')
  );

  insert into public.onboarding_ladder_events (
    user_id,
    event_type,
    card_print_id,
    collector_user_id,
    source,
    payload,
    dedupe_key
  ) values (
    v_uid,
    v_event_type,
    p_card_print_id,
    p_collector_user_id,
    v_source,
    v_payload,
    v_dedupe_key
  )
  on conflict (dedupe_key) where dedupe_key is not null do nothing;

  update public.onboarding_ladder_state s
  set
    owned_completed_at = case
      when v_event_type = 'rung_1_owned' then coalesce(s.owned_completed_at, now())
      else s.owned_completed_at
    end,
    owned_card_print_id = case
      when v_event_type = 'rung_1_owned' then coalesce(s.owned_card_print_id, p_card_print_id)
      else s.owned_card_print_id
    end,
    owned_source = case
      when v_event_type = 'rung_1_owned' then coalesce(s.owned_source, coalesce(v_source, 'search'))
      else s.owned_source
    end,
    wanted_completed_at = case
      when v_event_type = 'rung_1_wanted' then coalesce(s.wanted_completed_at, now())
      else s.wanted_completed_at
    end,
    wanted_card_print_id = case
      when v_event_type = 'rung_1_wanted' then coalesce(s.wanted_card_print_id, p_card_print_id)
      else s.wanted_card_print_id
    end,
    wanted_source = case
      when v_event_type = 'rung_1_wanted' then coalesce(s.wanted_source, coalesce(v_source, 'search'))
      else s.wanted_source
    end,
    loop_promise_shown_at = case
      when v_event_type = 'loop_promise_shown' then coalesce(s.loop_promise_shown_at, now())
      else s.loop_promise_shown_at
    end,
    suggestions_shown_at = case
      when v_event_type = 'collector_suggestions_shown' then coalesce(s.suggestions_shown_at, now())
      else s.suggestions_shown_at
    end,
    first_followed_at = case
      when v_event_type = 'rung_2_followed' then coalesce(s.first_followed_at, now())
      else s.first_followed_at
    end,
    first_followed_user_id = case
      when v_event_type = 'rung_2_followed' then coalesce(s.first_followed_user_id, p_collector_user_id)
      else s.first_followed_user_id
    end,
    first_pulse_with_item_at = case
      when v_event_type = 'rung_2_first_pulse_with_item' then coalesce(s.first_pulse_with_item_at, now())
      else s.first_pulse_with_item_at
    end,
    first_message_at = case
      when v_event_type = 'rung_3_first_message' then coalesce(s.first_message_at, now())
      else s.first_message_at
    end,
    first_match_acted_at = case
      when v_event_type = 'rung_3_first_match_acted' then coalesce(s.first_match_acted_at, now())
      else s.first_match_acted_at
    end
  where s.user_id = v_uid;

  update public.onboarding_ladder_state s
  set completed_at = coalesce(s.completed_at, now())
  where s.user_id = v_uid
    and s.completed_at is null
    and s.owned_completed_at is not null
    and s.wanted_completed_at is not null
    and (s.first_followed_at is not null or s.skipped_at is not null);

  return query select * from public.onboarding_ladder_state_v1();
end;
$$;

create or replace function public.onboarding_skip_v1(
  p_scope text
)
returns table (
  user_id uuid,
  owned_completed_at timestamptz,
  owned_card_print_id uuid,
  owned_source text,
  wanted_completed_at timestamptz,
  wanted_card_print_id uuid,
  wanted_source text,
  loop_promise_shown_at timestamptz,
  suggestions_shown_at timestamptz,
  first_followed_at timestamptz,
  first_followed_user_id uuid,
  first_pulse_with_item_at timestamptz,
  first_message_at timestamptz,
  first_match_acted_at timestamptz,
  skipped_at timestamptz,
  dismissed_forever_at timestamptz,
  completed_at timestamptz,
  needs_owned boolean,
  needs_wanted boolean,
  should_show_loop_promise boolean,
  should_show_collector_suggestions boolean,
  is_complete boolean,
  is_dismissed boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_scope text := lower(nullif(btrim(coalesce(p_scope, '')), ''));
  v_event_type text;
  v_dedupe_key text;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if v_scope not in ('step', 'all') then
    raise exception 'unsupported_skip_scope:%', coalesce(v_scope, '') using errcode = '22023';
  end if;

  perform public.onboarding_ladder_bootstrap_state_v1(v_uid);

  v_event_type := case when v_scope = 'all' then 'onboarding_dismissed' else 'onboarding_skipped' end;
  v_dedupe_key := concat_ws(':', 'onboarding', v_event_type, v_uid::text);

  insert into public.onboarding_ladder_events (
    user_id,
    event_type,
    source,
    payload,
    dedupe_key
  ) values (
    v_uid,
    v_event_type,
    'app',
    jsonb_build_object('scope', v_scope),
    v_dedupe_key
  )
  on conflict (dedupe_key) where dedupe_key is not null do nothing;

  update public.onboarding_ladder_state s
  set
    skipped_at = coalesce(s.skipped_at, now()),
    dismissed_forever_at = case
      when v_scope = 'all' then coalesce(s.dismissed_forever_at, now())
      else s.dismissed_forever_at
    end
  where s.user_id = v_uid;

  update public.onboarding_ladder_state s
  set completed_at = coalesce(s.completed_at, now())
  where s.user_id = v_uid
    and s.completed_at is null
    and (
      v_scope = 'all'
      or (
        s.owned_completed_at is not null
        and s.wanted_completed_at is not null
      )
    );

  return query select * from public.onboarding_ladder_state_v1();
end;
$$;

revoke all on function public.onboarding_ladder_state_v1() from public, anon;
revoke all on function public.onboarding_record_rung_v1(text, uuid, uuid, text, jsonb) from public, anon;
revoke all on function public.onboarding_skip_v1(text) from public, anon;

grant execute on function public.onboarding_ladder_state_v1() to authenticated, service_role;
grant execute on function public.onboarding_record_rung_v1(text, uuid, uuid, text, jsonb) to authenticated, service_role;
grant execute on function public.onboarding_skip_v1(text) to authenticated, service_role;

create or replace function public.onboarding_sync_user_card_intent_wishlist_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_card_print_id uuid;
begin
  if tg_op = 'DELETE' then
    v_user_id := old.user_id;
    v_card_print_id := old.card_print_id;
  else
    v_user_id := new.user_id;
    v_card_print_id := new.card_print_id;
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    if new.want is true then
      insert into public.wishlist_items (
        user_id,
        card_id,
        note
      ) values (
        new.user_id,
        new.card_print_id,
        null
      )
      on conflict (user_id, card_id) do nothing;
    elsif tg_op = 'UPDATE' and old.want is true and new.want is false then
      delete from public.wishlist_items wi
      where wi.user_id = new.user_id
        and wi.card_id = new.card_print_id;
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    if old.want is true then
      delete from public.wishlist_items wi
      where wi.user_id = old.user_id
        and wi.card_id = old.card_print_id;
    end if;
    return old;
  end if;

  return null;
exception
  when others then
    perform public.interest_graph_log_emit_failure_v1(
      'user_card_intents',
      'want_bridge_failed',
      v_user_id,
      v_card_print_id,
      jsonb_build_object('operation', tg_op),
      sqlerrm
    );
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
end;
$$;

drop trigger if exists trg_onboarding_user_card_intents_wishlist_sync on public.user_card_intents;
create trigger trg_onboarding_user_card_intents_wishlist_sync
after insert or update or delete on public.user_card_intents
for each row execute function public.onboarding_sync_user_card_intent_wishlist_v1();

comment on function public.onboarding_sync_user_card_intent_wishlist_v1() is
'E6 PR1 bridge. Keeps wishlist_items in sync with existing user_card_intents.want actions so E1/E3 canonical want flows see app wants. Idempotent inserts prevent duplicate E1 want_added events.';

insert into public.wishlist_items (
  user_id,
  card_id,
  note
)
select
  uci.user_id,
  uci.card_print_id,
  null::text
from public.user_card_intents uci
where uci.want is true
on conflict (user_id, card_id) do nothing;

commit;
