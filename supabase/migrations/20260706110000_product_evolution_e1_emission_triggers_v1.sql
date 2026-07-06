-- PRODUCT_EVOLUTION_E1_EMISSION_TRIGGERS_V1
-- Trigger-first interest graph emission. User writes must not fail because
-- card_events emission failed; trigger failures are captured durably.

create or replace function public.interest_graph_watch_strength_v1(p_reason text)
returns double precision
language sql
immutable
as $$
  select case lower(btrim(coalesce(p_reason, '')))
    when 'manual' then 1.0
    when 'want' then 0.95
    when 'owned' then 0.80
    when 'inferred' then 0.35
    else 0.35
  end
$$;

create or replace function public.interest_graph_watch_rank_v1(p_reason text)
returns integer
language sql
immutable
as $$
  select case lower(btrim(coalesce(p_reason, '')))
    when 'manual' then 4
    when 'want' then 3
    when 'owned' then 2
    when 'inferred' then 1
    else 0
  end
$$;

create or replace function public.interest_graph_upsert_watch_v1(
  p_user_id uuid,
  p_subject_type text,
  p_subject_id uuid,
  p_reason text,
  p_origin text default 'live'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reason text := lower(btrim(coalesce(p_reason, '')));
  v_subject_type text := lower(btrim(coalesce(p_subject_type, '')));
  v_origin text := lower(btrim(coalesce(p_origin, 'live')));
begin
  if p_user_id is null
     or p_subject_id is null
     or v_subject_type not in ('card', 'set', 'character', 'collector')
     or v_reason not in ('owned', 'want', 'inferred', 'manual') then
    return;
  end if;

  if v_origin not in ('live', 'backfill_v1') then
    v_origin := 'live';
  end if;

  insert into public.watches (
    user_id,
    subject_type,
    subject_id,
    reason,
    strength,
    origin
  ) values (
    p_user_id,
    v_subject_type,
    p_subject_id,
    v_reason,
    public.interest_graph_watch_strength_v1(v_reason),
    v_origin
  )
  on conflict (user_id, subject_type, subject_id) do update
  set
    reason = case
      when public.interest_graph_watch_rank_v1(excluded.reason)
        >= public.interest_graph_watch_rank_v1(public.watches.reason)
      then excluded.reason
      else public.watches.reason
    end,
    strength = greatest(public.watches.strength, excluded.strength),
    origin = case
      when public.watches.origin = 'backfill_v1' and excluded.origin = 'live'
      then 'live'
      else public.watches.origin
    end,
    updated_at = now();
end;
$$;

create or replace function public.interest_graph_log_emit_failure_v1(
  p_source text,
  p_event_type text,
  p_actor_user_id uuid,
  p_card_print_id uuid,
  p_payload jsonb,
  p_error_message text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.card_events_emit_failures (
    actor_user_id,
    event_type,
    card_print_id,
    source,
    error_message,
    payload
  ) values (
    p_actor_user_id,
    p_event_type,
    p_card_print_id,
    coalesce(nullif(btrim(p_source), ''), 'interest_graph_trigger'),
    left(coalesce(nullif(btrim(p_error_message), ''), 'unknown_error'), 1000),
    coalesce(p_payload, '{}'::jsonb)
  );
exception
  when others then
    null;
end;
$$;

create or replace function public.interest_graph_emit_event_v1(
  p_source text,
  p_event_type text,
  p_card_print_id uuid,
  p_actor_user_id uuid,
  p_subject_user_id uuid,
  p_payload jsonb default '{}'::jsonb,
  p_visibility text default null,
  p_dedupe_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
begin
  insert into public.card_events (
    event_type,
    card_print_id,
    actor_user_id,
    subject_user_id,
    payload,
    visibility,
    dedupe_key
  ) values (
    p_event_type,
    p_card_print_id,
    p_actor_user_id,
    p_subject_user_id,
    coalesce(p_payload, '{}'::jsonb),
    coalesce(p_visibility, 'private'),
    nullif(btrim(coalesce(p_dedupe_key, '')), '')
  )
  on conflict (dedupe_key) where dedupe_key is not null do nothing
  returning id into v_event_id;

  return v_event_id;
exception
  when others then
    perform public.interest_graph_log_emit_failure_v1(
      p_source,
      p_event_type,
      p_actor_user_id,
      p_card_print_id,
      p_payload,
      sqlerrm
    );
    return null;
end;
$$;

create or replace function public.interest_graph_owned_card_count_v1(
  p_user_id uuid,
  p_card_print_id uuid
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.vault_item_instances vii
  where vii.user_id = p_user_id
    and vii.card_print_id = p_card_print_id
    and vii.archived_at is null
$$;

create or replace function public.interest_graph_wishlist_after_insert_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.interest_graph_emit_event_v1(
    'wishlist_items',
    'want_added',
    new.card_id,
    new.user_id,
    null,
    jsonb_build_object('wishlist_item_id', new.id),
    'private',
    'want_added:' || new.id::text
  );
  perform public.interest_graph_upsert_watch_v1(new.user_id, 'card', new.card_id, 'want', 'live');
  return new;
exception
  when others then
    perform public.interest_graph_log_emit_failure_v1(
      'wishlist_items', 'want_added', new.user_id, new.card_id,
      jsonb_build_object('wishlist_item_id', new.id), sqlerrm
    );
    return new;
end;
$$;

create or replace function public.interest_graph_wishlist_after_delete_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.interest_graph_emit_event_v1(
    'wishlist_items',
    'want_removed',
    old.card_id,
    old.user_id,
    null,
    jsonb_build_object('wishlist_item_id', old.id),
    'private',
    'want_removed:' || old.id::text
  );

  if public.interest_graph_owned_card_count_v1(old.user_id, old.card_id) > 0 then
    insert into public.watches (
      user_id,
      subject_type,
      subject_id,
      reason,
      strength,
      origin
    ) values (
      old.user_id,
      'card',
      old.card_id,
      'owned',
      public.interest_graph_watch_strength_v1('owned'),
      'live'
    )
    on conflict (user_id, subject_type, subject_id) do update
    set
      reason = case
        when public.watches.reason = 'manual' then public.watches.reason
        else 'owned'
      end,
      strength = case
        when public.watches.reason = 'manual' then public.watches.strength
        else public.interest_graph_watch_strength_v1('owned')
      end,
      origin = case
        when public.watches.origin = 'backfill_v1' then 'live'
        else public.watches.origin
      end,
      updated_at = now();
  else
    delete from public.watches
    where user_id = old.user_id
      and subject_type = 'card'
      and subject_id = old.card_id
      and reason <> 'manual';
  end if;

  return old;
exception
  when others then
    perform public.interest_graph_log_emit_failure_v1(
      'wishlist_items', 'want_removed', old.user_id, old.card_id,
      jsonb_build_object('wishlist_item_id', old.id), sqlerrm
    );
    return old;
end;
$$;

create or replace function public.interest_graph_collector_follows_after_insert_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.interest_graph_emit_event_v1(
    'collector_follows',
    'collector_followed',
    null,
    new.follower_user_id,
    new.followed_user_id,
    jsonb_build_object('follow_id', new.id),
    'followers',
    'collector_followed:' || new.id::text
  );
  perform public.interest_graph_upsert_watch_v1(new.follower_user_id, 'collector', new.followed_user_id, 'manual', 'live');
  return new;
exception
  when others then
    perform public.interest_graph_log_emit_failure_v1(
      'collector_follows', 'collector_followed', new.follower_user_id, null,
      jsonb_build_object('follow_id', new.id, 'followed_user_id', new.followed_user_id), sqlerrm
    );
    return new;
end;
$$;

create or replace function public.interest_graph_collector_follows_after_delete_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.interest_graph_emit_event_v1(
    'collector_follows',
    'collector_unfollowed',
    null,
    old.follower_user_id,
    old.followed_user_id,
    jsonb_build_object('follow_id', old.id),
    'private',
    'collector_unfollowed:' || old.id::text
  );

  delete from public.watches
  where user_id = old.follower_user_id
    and subject_type = 'collector'
    and subject_id = old.followed_user_id;

  return old;
exception
  when others then
    perform public.interest_graph_log_emit_failure_v1(
      'collector_follows', 'collector_unfollowed', old.follower_user_id, null,
      jsonb_build_object('follow_id', old.id, 'followed_user_id', old.followed_user_id), sqlerrm
    );
    return old;
end;
$$;

create or replace function public.interest_graph_vault_instance_after_insert_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.card_print_id is null or new.archived_at is not null then
    return new;
  end if;

  perform public.interest_graph_emit_event_v1(
    'vault_item_instances',
    'vault_added',
    new.card_print_id,
    new.user_id,
    null,
    jsonb_build_object(
      'vault_item_instance_id', new.id,
      'gvvi_id', new.gv_vi_id,
      'card_printing_id', new.card_printing_id,
      'source', 'vault'
    ),
    null,
    'vault_added:' || new.id::text
  );
  perform public.interest_graph_upsert_watch_v1(new.user_id, 'card', new.card_print_id, 'owned', 'live');
  return new;
exception
  when others then
    perform public.interest_graph_log_emit_failure_v1(
      'vault_item_instances', 'vault_added', new.user_id, new.card_print_id,
      jsonb_build_object('vault_item_instance_id', new.id, 'gvvi_id', new.gv_vi_id), sqlerrm
    );
    return new;
end;
$$;

create or replace function public.interest_graph_vault_instance_after_update_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.card_print_id is null then
    return new;
  end if;

  if old.intent is distinct from new.intent then
    perform public.interest_graph_emit_event_v1(
      'vault_item_instances',
      'vault_intent_changed',
      new.card_print_id,
      new.user_id,
      null,
      jsonb_build_object(
        'vault_item_instance_id', new.id,
        'gvvi_id', new.gv_vi_id,
        'previous_intent', old.intent,
        'next_intent', new.intent
      ),
      null,
      'vault_intent_changed:' || new.id::text || ':' || extract(epoch from now())::text
    );
    perform public.interest_graph_upsert_watch_v1(new.user_id, 'card', new.card_print_id, 'owned', 'live');
  end if;

  return new;
exception
  when others then
    perform public.interest_graph_log_emit_failure_v1(
      'vault_item_instances', 'vault_intent_changed', new.user_id, new.card_print_id,
      jsonb_build_object('vault_item_instance_id', new.id, 'gvvi_id', new.gv_vi_id), sqlerrm
    );
    return new;
end;
$$;

create or replace function public.interest_graph_wall_sections_after_write_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.wall_sections%rowtype;
  v_action text;
begin
  v_row := new;
  v_action := case when tg_op = 'INSERT' then 'section_created' else 'section_updated' end;

  perform public.interest_graph_emit_event_v1(
    'wall_sections',
    'wall_updated',
    null,
    v_row.user_id,
    null,
    jsonb_build_object(
      'wall_section_id', v_row.id,
      'action', v_action,
      'is_active', v_row.is_active,
      'is_public', v_row.is_public
    ),
    null,
    'wall_updated:' || v_action || ':' || v_row.id::text || ':' || extract(epoch from now())::text
  );
  return new;
exception
  when others then
    perform public.interest_graph_log_emit_failure_v1(
      'wall_sections', 'wall_updated', v_row.user_id, null,
      jsonb_build_object('wall_section_id', v_row.id), sqlerrm
    );
    return new;
end;
$$;

create or replace function public.interest_graph_wall_memberships_after_write_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_section public.wall_sections%rowtype;
  v_instance public.vault_item_instances%rowtype;
  v_action text;
begin
  select * into v_section
  from public.wall_sections
  where id = coalesce(new.section_id, old.section_id);

  select * into v_instance
  from public.vault_item_instances
  where id = coalesce(new.vault_item_instance_id, old.vault_item_instance_id);

  if v_section.id is null or v_instance.id is null then
    return coalesce(new, old);
  end if;

  v_action := case when tg_op = 'INSERT' then 'membership_added' else 'membership_removed' end;

  perform public.interest_graph_emit_event_v1(
    'wall_section_memberships',
    'wall_updated',
    v_instance.card_print_id,
    v_section.user_id,
    null,
    jsonb_build_object(
      'wall_section_id', v_section.id,
      'vault_item_instance_id', v_instance.id,
      'gvvi_id', v_instance.gv_vi_id,
      'action', v_action
    ),
    null,
    'wall_updated:' || v_action || ':' || v_section.id::text || ':' || v_instance.id::text
  );

  if v_instance.card_print_id is not null and v_instance.archived_at is null then
    perform public.interest_graph_upsert_watch_v1(v_section.user_id, 'card', v_instance.card_print_id, 'owned', 'live');
  end if;

  return coalesce(new, old);
exception
  when others then
    perform public.interest_graph_log_emit_failure_v1(
      'wall_section_memberships', 'wall_updated', null, null,
      jsonb_build_object(
        'section_id', coalesce(new.section_id, old.section_id),
        'vault_item_instance_id', coalesce(new.vault_item_instance_id, old.vault_item_instance_id)
      ), sqlerrm
    );
    return coalesce(new, old);
end;
$$;

create or replace function public.scanner_v5_emit_vault_add_enriched_v1(
  p_user_id uuid,
  p_gvvi_id text,
  p_card_print_id uuid,
  p_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
begin
  if auth.uid() is distinct from p_user_id and auth.role() <> 'service_role' then
    raise exception 'not_authorized';
  end if;

  v_payload := v_payload || jsonb_build_object('gvvi_id', p_gvvi_id);
  v_event_id := public.interest_graph_emit_event_v1(
    'scanner_v5',
    'scanner_v5_vault_add_enriched',
    p_card_print_id,
    p_user_id,
    null,
    v_payload,
    'private',
    'scanner_v5_enriched:' || p_user_id::text || ':' || coalesce(p_gvvi_id, '')
  );
  return v_event_id;
end;
$$;

create or replace function public.card_events_emit_vault_import_summary_v1(
  p_user_id uuid,
  p_payload jsonb default '{}'::jsonb,
  p_import_run_id text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_dedupe text;
begin
  if auth.uid() is distinct from p_user_id and auth.role() <> 'service_role' then
    raise exception 'not_authorized';
  end if;

  v_dedupe := case
    when nullif(btrim(coalesce(p_import_run_id, '')), '') is null then null
    else 'vault_import:' || p_user_id::text || ':' || btrim(p_import_run_id)
  end;

  v_event_id := public.interest_graph_emit_event_v1(
    'vault_import',
    'vault_import',
    null,
    p_user_id,
    null,
    coalesce(p_payload, '{}'::jsonb),
    'private',
    v_dedupe
  );
  return v_event_id;
end;
$$;

create or replace function public.card_events_emit_completion_crossings_v1(
  p_user_id uuid,
  p_subject_type text,
  p_subject_id uuid,
  p_previous_percent integer,
  p_next_percent integer,
  p_payload jsonb default '{}'::jsonb
)
returns setof public.card_events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subject_type text := lower(btrim(coalesce(p_subject_type, '')));
  v_threshold integer;
  v_event_type text;
  v_event_id uuid;
  v_event public.card_events%rowtype;
begin
  if auth.uid() is distinct from p_user_id and auth.role() <> 'service_role' then
    raise exception 'not_authorized';
  end if;

  if v_subject_type not in ('set', 'character')
     or p_subject_id is null
     or p_previous_percent is null
     or p_next_percent is null
     or p_next_percent <= p_previous_percent then
    return;
  end if;

  v_event_type := case
    when v_subject_type = 'set' then 'set_completion_crossed'
    else 'dex_completion_crossed'
  end;

  foreach v_threshold in array array[25, 50, 75, 90, 100] loop
    if p_previous_percent < v_threshold and p_next_percent >= v_threshold then
      insert into public.completion_crossings (
        user_id,
        subject_type,
        subject_id,
        threshold,
        previous_percent,
        crossed_percent
      ) values (
        p_user_id,
        v_subject_type,
        p_subject_id,
        v_threshold,
        p_previous_percent,
        p_next_percent
      )
      on conflict (user_id, subject_type, subject_id, threshold) do nothing
      returning card_event_id into v_event_id;

      if found then
        v_event_id := public.interest_graph_emit_event_v1(
          'completion_crossings',
          v_event_type,
          null,
          p_user_id,
          null,
          coalesce(p_payload, '{}'::jsonb) || jsonb_build_object(
            'subject_type', v_subject_type,
            'subject_id', p_subject_id,
            'threshold', v_threshold,
            'previous_percent', p_previous_percent,
            'crossed_percent', p_next_percent
          ),
          'private',
          'completion_crossed:' || p_user_id::text || ':' || v_subject_type || ':' || p_subject_id::text || ':' || v_threshold::text
        );

        update public.completion_crossings
        set card_event_id = v_event_id
        where user_id = p_user_id
          and subject_type = v_subject_type
          and subject_id = p_subject_id
          and threshold = v_threshold
          and card_event_id is null;

        if v_event_id is not null then
          select * into v_event from public.card_events where id = v_event_id;
          if found then
            return next v_event;
          end if;
        end if;
      end if;
    end if;
  end loop;
end;
$$;

create or replace function public.interest_graph_completion_snapshot_for_card_v1(
  p_user_id uuid,
  p_card_print_id uuid
)
returns table (
  subject_type text,
  subject_id uuid,
  completion_percent integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_set_id uuid;
begin
  if auth.uid() is distinct from p_user_id and auth.role() <> 'service_role' then
    raise exception 'not_authorized';
  end if;

  if p_user_id is null or p_card_print_id is null then
    return;
  end if;

  select cp.set_id into v_set_id
  from public.card_prints cp
  where cp.id = p_card_print_id;

  if v_set_id is not null then
    return query
    select
      'set'::text as subject_type,
      usc.set_id as subject_id,
      usc.completion_percent
    from public.user_set_completion_v1(p_user_id, v_set_id) usc;
  end if;

  return query
  with touched_species as (
    select distinct gd.species_id
    from public.v_grookai_dex_card_prints_v1 gd
    where gd.card_print_id = p_card_print_id
      and gd.mapping_active = true
      and gd.counts_for_completion = true
  ),
  denominator as (
    select
      gd.species_id,
      count(distinct gd.card_print_id)::integer as total_print_count
    from public.v_grookai_dex_card_prints_v1 gd
    join touched_species ts on ts.species_id = gd.species_id
    where gd.mapping_active = true
      and gd.counts_for_completion = true
    group by gd.species_id
  ),
  owned as (
    select
      gd.species_id,
      count(distinct vii.card_print_id)::integer as owned_print_count
    from public.v_grookai_dex_card_prints_v1 gd
    join touched_species ts on ts.species_id = gd.species_id
    join public.vault_item_instances vii
      on vii.card_print_id = gd.card_print_id
     and vii.user_id = p_user_id
     and vii.archived_at is null
    where gd.mapping_active = true
      and gd.counts_for_completion = true
    group by gd.species_id
  )
  select
    'character'::text as subject_type,
    d.species_id as subject_id,
    case
      when d.total_print_count <= 0 then 0
      else round((coalesce(o.owned_print_count, 0)::numeric / d.total_print_count::numeric) * 100)::integer
    end as completion_percent
  from denominator d
  left join owned o on o.species_id = d.species_id;
end;
$$;

drop trigger if exists trg_interest_graph_wishlist_after_insert on public.wishlist_items;
create trigger trg_interest_graph_wishlist_after_insert
after insert on public.wishlist_items
for each row execute function public.interest_graph_wishlist_after_insert_v1();

drop trigger if exists trg_interest_graph_wishlist_after_delete on public.wishlist_items;
create trigger trg_interest_graph_wishlist_after_delete
after delete on public.wishlist_items
for each row execute function public.interest_graph_wishlist_after_delete_v1();

drop trigger if exists trg_interest_graph_collector_follows_after_insert on public.collector_follows;
create trigger trg_interest_graph_collector_follows_after_insert
after insert on public.collector_follows
for each row execute function public.interest_graph_collector_follows_after_insert_v1();

drop trigger if exists trg_interest_graph_collector_follows_after_delete on public.collector_follows;
create trigger trg_interest_graph_collector_follows_after_delete
after delete on public.collector_follows
for each row execute function public.interest_graph_collector_follows_after_delete_v1();

drop trigger if exists trg_interest_graph_vault_instance_after_insert on public.vault_item_instances;
create trigger trg_interest_graph_vault_instance_after_insert
after insert on public.vault_item_instances
for each row execute function public.interest_graph_vault_instance_after_insert_v1();

drop trigger if exists trg_interest_graph_vault_instance_after_update on public.vault_item_instances;
create trigger trg_interest_graph_vault_instance_after_update
after update of intent on public.vault_item_instances
for each row execute function public.interest_graph_vault_instance_after_update_v1();

drop trigger if exists trg_interest_graph_wall_sections_after_write on public.wall_sections;
create trigger trg_interest_graph_wall_sections_after_write
after insert or update on public.wall_sections
for each row execute function public.interest_graph_wall_sections_after_write_v1();

drop trigger if exists trg_interest_graph_wall_memberships_after_insert on public.wall_section_memberships;
create trigger trg_interest_graph_wall_memberships_after_insert
after insert on public.wall_section_memberships
for each row execute function public.interest_graph_wall_memberships_after_write_v1();

drop trigger if exists trg_interest_graph_wall_memberships_after_delete on public.wall_section_memberships;
create trigger trg_interest_graph_wall_memberships_after_delete
after delete on public.wall_section_memberships
for each row execute function public.interest_graph_wall_memberships_after_write_v1();

revoke all on function public.scanner_v5_emit_vault_add_enriched_v1(uuid, text, uuid, jsonb) from public, anon;
grant execute on function public.scanner_v5_emit_vault_add_enriched_v1(uuid, text, uuid, jsonb) to authenticated, service_role;

revoke all on function public.card_events_emit_vault_import_summary_v1(uuid, jsonb, text) from public, anon;
grant execute on function public.card_events_emit_vault_import_summary_v1(uuid, jsonb, text) to authenticated, service_role;

revoke all on function public.card_events_emit_completion_crossings_v1(uuid, text, uuid, integer, integer, jsonb) from public, anon;
grant execute on function public.card_events_emit_completion_crossings_v1(uuid, text, uuid, integer, integer, jsonb) to authenticated, service_role;

revoke all on function public.interest_graph_completion_snapshot_for_card_v1(uuid, uuid) from public, anon;
grant execute on function public.interest_graph_completion_snapshot_for_card_v1(uuid, uuid) to authenticated, service_role;
