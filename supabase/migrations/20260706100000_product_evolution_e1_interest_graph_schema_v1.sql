begin;

create table if not exists public.watches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_type text not null,
  subject_id uuid not null,
  reason text not null,
  strength double precision not null default 1.0,
  muted_at timestamptz null,
  origin text not null default 'live',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint watches_subject_type_check
    check (subject_type = any (array['card'::text, 'set'::text, 'character'::text, 'collector'::text])),
  constraint watches_reason_check
    check (reason = any (array['owned'::text, 'want'::text, 'inferred'::text, 'manual'::text])),
  constraint watches_strength_range_check
    check (strength >= 0 and strength <= 1),
  constraint watches_origin_check
    check (origin = any (array['live'::text, 'backfill_v1'::text])),
  constraint watches_unique_subject
    unique (user_id, subject_type, subject_id)
);

comment on table public.watches is
'Durable per-user interest graph. One row per watched card, set, character, or collector.';

comment on column public.watches.origin is
'Creation origin for rollback/audit. live rows are user/action generated; backfill_v1 rows are created by the E1 backfill job.';

create index if not exists watches_user_subject_created_idx
  on public.watches (user_id, subject_type, created_at desc);

create index if not exists watches_subject_lookup_idx
  on public.watches (subject_type, subject_id);

create index if not exists watches_user_active_idx
  on public.watches (user_id, muted_at)
  where muted_at is null;

drop trigger if exists trg_watches_updated_at on public.watches;
create trigger trg_watches_updated_at
before update on public.watches
for each row
execute function public.set_timestamp_updated_at();

create table if not exists public.card_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  card_print_id uuid null references public.card_prints(id) on delete set null,
  actor_user_id uuid null references auth.users(id) on delete set null,
  subject_user_id uuid null references auth.users(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  visibility text not null default 'private',
  dedupe_key text null,
  created_at timestamptz not null default now(),
  constraint card_events_event_type_nonempty_check
    check (btrim(event_type) <> ''),
  constraint card_events_visibility_check
    check (visibility = any (array['public'::text, 'followers'::text, 'private'::text])),
  constraint card_events_payload_object_check
    check (jsonb_typeof(payload) = 'object'),
  constraint card_events_dedupe_key_nonempty_check
    check (dedupe_key is null or btrim(dedupe_key) <> '')
);

comment on table public.card_events is
'Append-only canonical interest/event stream for collection, want, follow, wall, scanner, import, and completion activity.';

comment on column public.card_events.dedupe_key is
'Optional idempotency key for one-shot event classes.';

create index if not exists card_events_created_idx
  on public.card_events (created_at desc, id desc);

create index if not exists card_events_card_created_idx
  on public.card_events (card_print_id, created_at desc, id desc);

create index if not exists card_events_actor_created_idx
  on public.card_events (actor_user_id, created_at desc, id desc);

create index if not exists card_events_subject_created_idx
  on public.card_events (subject_user_id, created_at desc, id desc);

create index if not exists card_events_type_created_idx
  on public.card_events (event_type, created_at desc, id desc);

create unique index if not exists card_events_dedupe_key_unique_idx
  on public.card_events (dedupe_key)
  where dedupe_key is not null;

create table if not exists public.card_events_emit_failures (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid null references auth.users(id) on delete set null,
  event_type text null,
  card_print_id uuid null references public.card_prints(id) on delete set null,
  source text not null,
  error_message text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint card_events_emit_failures_source_nonempty_check
    check (btrim(source) <> ''),
  constraint card_events_emit_failures_error_nonempty_check
    check (btrim(error_message) <> ''),
  constraint card_events_emit_failures_payload_object_check
    check (jsonb_typeof(payload) = 'object')
);

comment on table public.card_events_emit_failures is
'Durable production failure log for non-trigger E1 emitters. Emitters must log here instead of silently dropping failed card_events writes.';

create index if not exists card_events_emit_failures_actor_created_idx
  on public.card_events_emit_failures (actor_user_id, created_at desc);

create index if not exists card_events_emit_failures_source_created_idx
  on public.card_events_emit_failures (source, created_at desc);

create table if not exists public.completion_crossings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_type text not null,
  subject_id uuid not null,
  threshold integer not null,
  previous_percent integer not null,
  crossed_percent integer not null,
  card_event_id uuid null references public.card_events(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint completion_crossings_subject_type_check
    check (subject_type = any (array['set'::text, 'character'::text])),
  constraint completion_crossings_threshold_check
    check (threshold = any (array[25, 50, 75, 90, 100])),
  constraint completion_crossings_previous_percent_check
    check (previous_percent >= 0 and previous_percent <= 100),
  constraint completion_crossings_crossed_percent_check
    check (crossed_percent >= 0 and crossed_percent <= 100),
  constraint completion_crossings_upward_check
    check (previous_percent < threshold and crossed_percent >= threshold),
  constraint completion_crossings_unique_threshold
    unique (user_id, subject_type, subject_id, threshold)
);

comment on table public.completion_crossings is
'Dedup lane for upward-only set and character completion threshold crossings.';

create index if not exists completion_crossings_user_created_idx
  on public.completion_crossings (user_id, created_at desc);

create index if not exists completion_crossings_subject_idx
  on public.completion_crossings (subject_type, subject_id, threshold);

create or replace function public.interest_graph_collector_public_v1(
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.public_profiles pp
    where pp.user_id = p_user_id
      and pp.public_profile_enabled is true
      and pp.vault_sharing_enabled is true
  );
$$;

comment on function public.interest_graph_collector_public_v1(uuid) is
'E1 privacy helper. True only when the collector has both public profile and vault sharing enabled.';

create or replace function public.interest_graph_collectors_visible_to_viewer_v1(
  p_viewer_user_id uuid,
  p_actor_user_id uuid,
  p_subject_user_id uuid default null
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_viewer_user_id is null or p_actor_user_id is null then
    return false;
  end if;

  if public.interest_graph_collector_public_v1(p_actor_user_id) is false then
    return false;
  end if;

  if p_subject_user_id is not null
     and p_subject_user_id <> p_viewer_user_id
     and public.interest_graph_collector_public_v1(p_subject_user_id) is false then
    return false;
  end if;

  if public.local_community_collectors_are_blocked_v1(p_viewer_user_id, p_actor_user_id) then
    return false;
  end if;

  if p_subject_user_id is not null
     and p_subject_user_id <> p_actor_user_id
     and public.local_community_collectors_are_blocked_v1(p_viewer_user_id, p_subject_user_id) then
    return false;
  end if;

  if exists (
    select 1
    from public.collector_local_mutes m
    where m.muter_user_id = p_viewer_user_id
      and m.muted_user_id = p_actor_user_id
      and (m.expires_at is null or m.expires_at > now())
  ) then
    return false;
  end if;

  if p_subject_user_id is not null
     and p_subject_user_id <> p_actor_user_id
     and exists (
       select 1
       from public.collector_local_mutes m
       where m.muter_user_id = p_viewer_user_id
         and m.muted_user_id = p_subject_user_id
         and (m.expires_at is null or m.expires_at > now())
     ) then
    return false;
  end if;

  return true;
end;
$$;

comment on function public.interest_graph_collectors_visible_to_viewer_v1(uuid, uuid, uuid) is
'E1 privacy helper mirroring local_community_feed_v2 gates: public profile, vault sharing, blocks, and active mutes.';

create or replace function public.interest_graph_card_event_visible_to_viewer_v1(
  p_viewer_user_id uuid,
  p_actor_user_id uuid,
  p_subject_user_id uuid,
  p_visibility text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_viewer_user_id is null then
    return false;
  end if;

  if p_actor_user_id = p_viewer_user_id
     or p_subject_user_id = p_viewer_user_id then
    return true;
  end if;

  if p_visibility = 'private' then
    return false;
  end if;

  if public.interest_graph_collectors_visible_to_viewer_v1(
    p_viewer_user_id,
    p_actor_user_id,
    p_subject_user_id
  ) is false then
    return false;
  end if;

  if p_visibility = 'followers' then
    return exists (
      select 1
      from public.collector_follows cf
      where cf.follower_user_id = p_viewer_user_id
        and cf.followed_user_id = p_actor_user_id
    );
  end if;

  return p_visibility = 'public';
end;
$$;

comment on function public.interest_graph_card_event_visible_to_viewer_v1(uuid, uuid, uuid, text) is
'E1 card_events visibility predicate used by RLS and card_events_feed_v1.';

create or replace function public.card_events_resolve_visibility_v1(
  p_event_type text,
  p_actor_user_id uuid,
  p_requested_visibility text default null,
  p_payload jsonb default '{}'::jsonb
)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_event_type text := lower(btrim(coalesce(p_event_type, '')));
  v_requested text := lower(btrim(coalesce(p_requested_visibility, 'private')));
  v_next_intent text := lower(btrim(coalesce(p_payload ->> 'next_intent', '')));
begin
  if v_event_type = 'vault_added' then
    if public.interest_graph_collector_public_v1(p_actor_user_id) then
      return 'public';
    end if;

    return 'private';
  end if;

  if v_event_type = 'vault_intent_changed' then
    if v_next_intent = any (array['trade'::text, 'sell'::text, 'showcase'::text])
       and public.interest_graph_collector_public_v1(p_actor_user_id) then
      return 'public';
    end if;

    return 'private';
  end if;

  if v_event_type = 'wall_updated' then
    if public.interest_graph_collector_public_v1(p_actor_user_id) then
      return 'public';
    end if;

    return 'private';
  end if;

  if v_event_type = 'collector_followed' then
    return 'followers';
  end if;

  if v_event_type = any (array[
    'collector_unfollowed'::text,
    'want_added'::text,
    'want_removed'::text,
    'set_completion_crossed'::text,
    'dex_completion_crossed'::text,
    'vault_import'::text,
    'scanner_v5_vault_add_enriched'::text
  ]) then
    return 'private';
  end if;

  if v_requested = any (array['public'::text, 'followers'::text, 'private'::text]) then
    return v_requested;
  end if;

  return 'private';
end;
$$;

comment on function public.card_events_resolve_visibility_v1(text, uuid, text, jsonb) is
'Pins E1 visibility at write time. vault_added and public intents depend on profile+vault sharing; collector_followed is followers.';

create or replace function public.card_events_set_defaults_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.event_type := lower(btrim(new.event_type));
  new.actor_user_id := coalesce(new.actor_user_id, auth.uid());
  new.payload := coalesce(new.payload, '{}'::jsonb);
  new.created_at := coalesce(new.created_at, now());
  new.visibility := public.card_events_resolve_visibility_v1(
    new.event_type,
    new.actor_user_id,
    new.visibility,
    new.payload
  );

  if new.dedupe_key is not null then
    new.dedupe_key := btrim(new.dedupe_key);
  end if;

  return new;
end;
$$;

create or replace function public.card_events_block_mutation_v1()
returns trigger
language plpgsql
as $$
begin
  raise exception 'card_events is append-only';
end;
$$;

drop trigger if exists trg_card_events_set_defaults on public.card_events;
create trigger trg_card_events_set_defaults
before insert on public.card_events
for each row execute function public.card_events_set_defaults_v1();

drop trigger if exists trg_card_events_block_update on public.card_events;
create trigger trg_card_events_block_update
before update on public.card_events
for each row execute function public.card_events_block_mutation_v1();

drop trigger if exists trg_card_events_block_delete on public.card_events;
create trigger trg_card_events_block_delete
before delete on public.card_events
for each row execute function public.card_events_block_mutation_v1();

create or replace function public.card_events_emit_failures_set_defaults_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.actor_user_id := coalesce(new.actor_user_id, auth.uid());
  new.source := btrim(new.source);
  new.error_message := btrim(new.error_message);
  new.payload := coalesce(new.payload, '{}'::jsonb);
  new.created_at := coalesce(new.created_at, now());
  return new;
end;
$$;

create or replace function public.card_events_emit_failures_block_mutation_v1()
returns trigger
language plpgsql
as $$
begin
  raise exception 'card_events_emit_failures is append-only';
end;
$$;

drop trigger if exists trg_card_events_emit_failures_set_defaults on public.card_events_emit_failures;
create trigger trg_card_events_emit_failures_set_defaults
before insert on public.card_events_emit_failures
for each row execute function public.card_events_emit_failures_set_defaults_v1();

drop trigger if exists trg_card_events_emit_failures_block_update on public.card_events_emit_failures;
create trigger trg_card_events_emit_failures_block_update
before update on public.card_events_emit_failures
for each row execute function public.card_events_emit_failures_block_mutation_v1();

drop trigger if exists trg_card_events_emit_failures_block_delete on public.card_events_emit_failures;
create trigger trg_card_events_emit_failures_block_delete
before delete on public.card_events_emit_failures
for each row execute function public.card_events_emit_failures_block_mutation_v1();

create or replace function public.user_set_completion_v1(
  p_user_id uuid,
  p_set_id uuid
)
returns table (
  set_id uuid,
  parent_print_count integer,
  variant_option_count integer,
  owned_variant_option_count integer,
  missing_variant_option_count integer,
  completion_percent integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    raise exception 'p_user_id is required';
  end if;

  if p_set_id is null then
    raise exception 'p_set_id is required';
  end if;

  if auth.role() <> 'service_role'
     and (auth.uid() is null or auth.uid() <> p_user_id) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  return query
  with parent_prints as (
    select cp.id
    from public.card_prints cp
    where cp.set_id = p_set_id
  ),
  child_options as (
    select
      pp.id as card_print_id,
      cpn.id as card_printing_id
    from parent_prints pp
    join public.card_printings cpn
      on cpn.card_print_id = pp.id
  ),
  fallback_options as (
    select
      pp.id as card_print_id,
      null::uuid as card_printing_id
    from parent_prints pp
    where not exists (
      select 1
      from public.card_printings cpn
      where cpn.card_print_id = pp.id
    )
  ),
  options as (
    select * from child_options
    union all
    select * from fallback_options
  ),
  owned_options as (
    select distinct
      o.card_print_id,
      o.card_printing_id
    from options o
    join public.vault_item_instances vii
      on vii.user_id = p_user_id
     and vii.archived_at is null
     and vii.card_print_id = o.card_print_id
     and (
       (o.card_printing_id is not null and vii.card_printing_id = o.card_printing_id)
       or o.card_printing_id is null
     )
  ),
  counts as (
    select
      (select count(*)::integer from parent_prints) as parent_print_count,
      (select count(*)::integer from options) as variant_option_count,
      (select count(*)::integer from owned_options) as owned_variant_option_count
  )
  select
    p_set_id as set_id,
    c.parent_print_count,
    c.variant_option_count,
    c.owned_variant_option_count,
    greatest(c.variant_option_count - c.owned_variant_option_count, 0)::integer as missing_variant_option_count,
    case
      when c.variant_option_count <= 0 then 0
      else round((c.owned_variant_option_count::numeric / c.variant_option_count::numeric) * 100)::integer
    end as completion_percent
  from counts c;
end;
$$;

comment on function public.user_set_completion_v1(uuid, uuid) is
'E1 shared set completion helper. Denominator is child card_printings plus fallback parent prints; numerator is active vault_item_instances for the authenticated user.';

create or replace function public.card_events_feed_v1(
  p_limit integer default 40,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null
)
returns table (
  event_id uuid,
  event_type text,
  card_print_id uuid,
  gv_id text,
  card_name text,
  set_code text,
  set_name text,
  card_number text,
  actor_slug text,
  actor_display_name text,
  subject_slug text,
  subject_display_name text,
  payload jsonb,
  visibility text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_limit integer := least(greatest(coalesce(p_limit, 40), 1), 80);
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  return query
  select
    e.id as event_id,
    e.event_type,
    e.card_print_id,
    cp.gv_id,
    cp.name as card_name,
    cp.set_code,
    s.name as set_name,
    cp.number as card_number,
    actor_profile.slug as actor_slug,
    actor_profile.display_name as actor_display_name,
    subject_profile.slug as subject_slug,
    subject_profile.display_name as subject_display_name,
    e.payload,
    e.visibility,
    e.created_at
  from public.card_events e
  left join public.card_prints cp
    on cp.id = e.card_print_id
  left join public.sets s
    on s.id = cp.set_id
  left join public.public_profiles actor_profile
    on actor_profile.user_id = e.actor_user_id
  left join public.public_profiles subject_profile
    on subject_profile.user_id = e.subject_user_id
  where public.interest_graph_card_event_visible_to_viewer_v1(
      v_uid,
      e.actor_user_id,
      e.subject_user_id,
      e.visibility
    )
    and (
      p_before_created_at is null
      or e.created_at < p_before_created_at
      or (
        p_before_id is not null
        and e.created_at = p_before_created_at
        and e.id < p_before_id
      )
    )
  order by e.created_at desc, e.id desc
  limit v_limit;
end;
$$;

comment on function public.card_events_feed_v1(integer, timestamptz, uuid) is
'E1 keyset-paginated card event read RPC. Uses auth.uid() and the same privacy gates as local_community_feed_v2.';

alter table public.watches enable row level security;
alter table public.card_events enable row level security;
alter table public.card_events_emit_failures enable row level security;
alter table public.completion_crossings enable row level security;

revoke all on table public.watches from public, anon, authenticated;
revoke all on table public.card_events from public, anon, authenticated;
revoke all on table public.card_events_emit_failures from public, anon, authenticated;
revoke all on table public.completion_crossings from public, anon, authenticated;

grant select, insert, update, delete on table public.watches to authenticated;
grant select, insert on table public.card_events to authenticated;
grant select, insert on table public.card_events_emit_failures to authenticated;
grant select on table public.completion_crossings to authenticated;

grant all on table public.watches to service_role;
grant all on table public.card_events to service_role;
grant all on table public.card_events_emit_failures to service_role;
grant all on table public.completion_crossings to service_role;

drop policy if exists watches_owner_select on public.watches;
create policy watches_owner_select
on public.watches
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists watches_owner_insert on public.watches;
create policy watches_owner_insert
on public.watches
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists watches_owner_update on public.watches;
create policy watches_owner_update
on public.watches
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists watches_owner_delete on public.watches;
create policy watches_owner_delete
on public.watches
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists watches_service_role_all on public.watches;
create policy watches_service_role_all
on public.watches
for all
to service_role
using (true)
with check (true);

drop policy if exists card_events_visibility_select on public.card_events;
create policy card_events_visibility_select
on public.card_events
for select
to authenticated
using (
  public.interest_graph_card_event_visible_to_viewer_v1(
    auth.uid(),
    actor_user_id,
    subject_user_id,
    visibility
  )
);

drop policy if exists card_events_actor_insert on public.card_events;
create policy card_events_actor_insert
on public.card_events
for insert
to authenticated
with check (
  actor_user_id = auth.uid()
  and jsonb_typeof(payload) = 'object'
);

drop policy if exists card_events_service_role_all on public.card_events;
create policy card_events_service_role_all
on public.card_events
for all
to service_role
using (true)
with check (true);

drop policy if exists card_events_emit_failures_owner_select on public.card_events_emit_failures;
create policy card_events_emit_failures_owner_select
on public.card_events_emit_failures
for select
to authenticated
using (actor_user_id = auth.uid());

drop policy if exists card_events_emit_failures_owner_insert on public.card_events_emit_failures;
create policy card_events_emit_failures_owner_insert
on public.card_events_emit_failures
for insert
to authenticated
with check (actor_user_id = auth.uid());

drop policy if exists card_events_emit_failures_service_role_all on public.card_events_emit_failures;
create policy card_events_emit_failures_service_role_all
on public.card_events_emit_failures
for all
to service_role
using (true)
with check (true);

drop policy if exists completion_crossings_owner_select on public.completion_crossings;
create policy completion_crossings_owner_select
on public.completion_crossings
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists completion_crossings_service_role_all on public.completion_crossings;
create policy completion_crossings_service_role_all
on public.completion_crossings
for all
to service_role
using (true)
with check (true);

revoke all on function public.interest_graph_collector_public_v1(uuid) from public;
revoke all on function public.interest_graph_collectors_visible_to_viewer_v1(uuid, uuid, uuid) from public;
revoke all on function public.interest_graph_card_event_visible_to_viewer_v1(uuid, uuid, uuid, text) from public;
revoke all on function public.card_events_resolve_visibility_v1(text, uuid, text, jsonb) from public;
revoke all on function public.user_set_completion_v1(uuid, uuid) from public, anon;
revoke all on function public.card_events_feed_v1(integer, timestamptz, uuid) from public, anon;

grant execute on function public.interest_graph_collector_public_v1(uuid) to authenticated, service_role;
grant execute on function public.interest_graph_collectors_visible_to_viewer_v1(uuid, uuid, uuid) to authenticated, service_role;
grant execute on function public.interest_graph_card_event_visible_to_viewer_v1(uuid, uuid, uuid, text) to authenticated, service_role;
grant execute on function public.card_events_resolve_visibility_v1(text, uuid, text, jsonb) to authenticated, service_role;
grant execute on function public.user_set_completion_v1(uuid, uuid) to authenticated, service_role;
grant execute on function public.card_events_feed_v1(integer, timestamptz, uuid) to authenticated, service_role;

commit;
