-- SECURITY_ADVISOR_VIEWER_ARGUMENT_BINDING_V1
-- Prevents authenticated callers from evaluating privacy predicates as an
-- arbitrary viewer while preserving service-owned composition and RLS calls.

begin;

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
  if auth.uid() is not null
     and p_viewer_user_id is distinct from auth.uid() then
    return false;
  end if;

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
  if auth.uid() is not null
     and p_viewer_user_id is distinct from auth.uid() then
    return false;
  end if;

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
  if auth.uid() is not null
     and p_actor_user_id is distinct from auth.uid() then
    return 'private';
  end if;

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

create or replace function public.local_community_collector_visible_to_viewer_v1(
  p_viewer_user_id uuid,
  p_owner_user_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
     and p_viewer_user_id is distinct from auth.uid() then
    return false;
  end if;

  if p_viewer_user_id is null or p_owner_user_id is null then
    return false;
  end if;

  if public.interest_graph_collector_public_v1(p_owner_user_id) is false then
    return false;
  end if;

  if public.local_community_collectors_are_blocked_v1(p_viewer_user_id, p_owner_user_id) then
    return false;
  end if;

  if exists (
    select 1
    from public.collector_local_mutes m
    where m.muter_user_id = p_viewer_user_id
      and m.muted_user_id = p_owner_user_id
      and (m.expires_at is null or m.expires_at > now())
  ) then
    return false;
  end if;

  return true;
end;
$$;

create or replace function public.trust_block_exists_between_v1(
  p_user_id uuid,
  p_other_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is not null
         and auth.uid() is distinct from p_user_id
         and auth.uid() is distinct from p_other_user_id
      then true
    else exists (
      select 1
      from public.trust_blocks tb
      where (
        tb.user_id = p_user_id
        and tb.blocked_user_id = p_other_user_id
      )
      or (
        tb.user_id = p_other_user_id
        and tb.blocked_user_id = p_user_id
      )
    )
  end;
$$;

create or replace function public.binder_card_event_visible_to_viewer_v1(
  p_viewer_user_id uuid,
  p_event_type text,
  p_card_print_id uuid,
  p_actor_user_id uuid,
  p_subject_user_id uuid,
  p_visibility text,
  p_payload jsonb,
  p_dedupe_key text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_event_type text := lower(btrim(coalesce(p_event_type, '')));
  v_public_id uuid;
  v_revision integer;
  v_threshold integer;
begin
  if auth.uid() is not null
     and p_viewer_user_id is distinct from auth.uid() then
    return false;
  end if;

  if left(v_event_type, 7) <> 'binder_' then
    return public.interest_graph_card_event_visible_to_viewer_v1(
      p_viewer_user_id,
      p_actor_user_id,
      p_subject_user_id,
      p_visibility
    );
  end if;
  if v_event_type <> 'binder_milestone_shared'
     or p_card_print_id is not null
     or p_subject_user_id is not null
     or p_visibility <> 'public'
     or jsonb_typeof(coalesce(p_payload, 'null'::jsonb)) <> 'object'
     or not public.interest_graph_card_event_visible_to_viewer_v1(
       p_viewer_user_id,
       p_actor_user_id,
       p_subject_user_id,
       p_visibility
     ) then
    return false;
  end if;

  v_public_id := public.pulse_jsonb_uuid_v1(p_payload ->> 'binder_public_id');
  if nullif(p_payload ->> 'definition_revision', '') !~ '^[0-9]+$'
     or nullif(p_payload ->> 'threshold', '') !~ '^[0-9]+$' then
    return false;
  end if;
  v_revision := (p_payload ->> 'definition_revision')::integer;
  v_threshold := (p_payload ->> 'threshold')::integer;
  if v_public_id is null
     or v_revision < 1
     or v_threshold not in (25, 50, 75, 90, 100)
     or p_dedupe_key is distinct from concat_ws(
       ':',
       'binder-milestone',
       v_public_id::text,
       v_revision::text,
       v_threshold::text
     ) then
    return false;
  end if;

  return exists (
    select 1
    from public.binders b
    where b.public_id = v_public_id
      and b.owner_user_id = p_actor_user_id
      and b.definition_revision = v_revision
      and b.lifecycle = 'active'
      and b.moderation_state = 'clear'
      and b.read_access = 'public'
      and b.discoverability = 'listed'
      and public.binder_feature_enabled_v1('schema_internal')
      and public.binder_feature_enabled_v1('public')
      and public.binder_feature_enabled_v1('pulse_milestones')
      and public.binder_target_enabled_v1(b.id)
      and public.interest_graph_collector_public_v1(b.owner_user_id)
      and not public.binder_pair_blocked_v1(p_viewer_user_id, b.owner_user_id)
      and exists (
        select 1
        from public.binder_progress_crossings crossing
        where crossing.binder_id = b.id
          and crossing.definition_revision = v_revision
          and crossing.threshold = v_threshold
      )
      and exists (
        select 1
        from public.binder_activity_events activity
        where activity.binder_id = b.id
          and activity.event_type = 'milestone_shared_to_pulse'
          and activity.actor_kind = 'user'
          and activity.actor_user_id = b.owner_user_id
          and activity.payload ->> 'definition_revision' = v_revision::text
          and activity.payload ->> 'threshold' = v_threshold::text
      )
  );
exception
  when others then
    return false;
end;
$$;

comment on function public.interest_graph_collectors_visible_to_viewer_v1(uuid, uuid, uuid) is
'Viewer privacy predicate. Authenticated callers are bound to auth.uid(); service-owned composition remains supported.';
comment on function public.interest_graph_card_event_visible_to_viewer_v1(uuid, uuid, uuid, text) is
'Event privacy predicate. Authenticated callers are bound to auth.uid(); service-owned composition remains supported.';
comment on function public.card_events_resolve_visibility_v1(text, uuid, text, jsonb) is
'Write-time visibility predicate. Authenticated actor claims are bound to auth.uid(); mismatches resolve private.';
comment on function public.local_community_collector_visible_to_viewer_v1(uuid, uuid) is
'Local-community privacy predicate. Authenticated callers are bound to auth.uid(); service-owned composition remains supported.';
comment on function public.trust_block_exists_between_v1(uuid, uuid) is
'Block privacy predicate. Authenticated callers may evaluate only a pair involving auth.uid(); mismatches fail closed.';
comment on function public.binder_card_event_visible_to_viewer_v1(uuid, text, uuid, uuid, uuid, text, jsonb, text) is
'Binder event privacy predicate. Authenticated callers are bound to auth.uid(); service-owned composition remains supported.';

notify pgrst, 'reload schema';

commit;
