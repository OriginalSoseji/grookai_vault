begin;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'card_events'
      and column_name = 'dedupe_key'
  ) then
    raise exception 'E3 PR2 requires public.card_events.dedupe_key';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'notification_outbox'
      and column_name = 'dedupe_key'
  ) then
    raise exception 'E3 PR2 requires public.notification_outbox.dedupe_key';
  end if;
end;
$$;

create table if not exists public.want_matches (
  id uuid primary key default gen_random_uuid(),
  want_user_id uuid not null references auth.users(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  card_print_id uuid not null references public.card_prints(id) on delete cascade,
  vault_item_id uuid null references public.vault_items(id) on delete set null,
  instance_id uuid null references public.vault_item_instances(id) on delete set null,
  distance_bucket text not null,
  locality_label text null,
  relationship_context text null,
  intent text null,
  source_type text null,
  match_strength double precision not null,
  recommended_tier text not null,
  status text not null default 'active',
  first_seen_available_at timestamptz not null default now(),
  last_seen_available_at timestamptz not null default now(),
  surfaced_at timestamptz null,
  acted_at timestamptz null,
  stale_marked_at timestamptz null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint want_matches_no_self_match check (want_user_id <> owner_user_id),
  constraint want_matches_distance_bucket_check check (distance_bucket = any (array['nearby'::text, 'same_region'::text])),
  constraint want_matches_match_strength_check check (match_strength >= 0 and match_strength <= 1),
  constraint want_matches_recommended_tier_check check (recommended_tier = any (array['instant'::text, 'digest'::text])),
  constraint want_matches_status_check check (status = any (array['active'::text, 'stale'::text, 'acted'::text])),
  constraint want_matches_payload_object_check check (jsonb_typeof(payload) = 'object')
);

comment on table public.want_matches is
'E3 durable want-match state machine. Rows are upserted by the service-role engine from the shared local-community predicate; stale cleanup marks rows stale after a 7-day grace window and never hard-deletes.';

comment on column public.want_matches.match_strength is
'Deterministic score copied from local_community_want_match_candidates_v1: distance base + intent bonus + following bonus - recency decay, clamped 0..1.';

create unique index if not exists want_matches_user_copy_unique_idx
  on public.want_matches (
    want_user_id,
    owner_user_id,
    card_print_id,
    coalesce(vault_item_id, instance_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

create index if not exists want_matches_want_status_seen_idx
  on public.want_matches (want_user_id, status, last_seen_available_at desc);

create index if not exists want_matches_owner_card_status_idx
  on public.want_matches (owner_user_id, card_print_id, status);

create index if not exists want_matches_stale_scan_idx
  on public.want_matches (status, last_seen_available_at)
  where status = 'active';

drop trigger if exists trg_want_matches_updated_at on public.want_matches;
create trigger trg_want_matches_updated_at
before update on public.want_matches
for each row
execute function public.set_timestamp_updated_at();

alter table public.want_matches enable row level security;

revoke all on table public.want_matches from public, anon, authenticated;
grant select on table public.want_matches to authenticated;
grant all on table public.want_matches to service_role;

drop policy if exists want_matches_want_user_select on public.want_matches;
create policy want_matches_want_user_select
on public.want_matches
for select
to authenticated
using (auth.uid() = want_user_id);

drop policy if exists want_matches_service_role_all on public.want_matches;
create policy want_matches_service_role_all
on public.want_matches
for all
to service_role
using (true)
with check (true);

create or replace function public.want_match_resolve_event_id_v1(
  p_dedupe_key text
)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.card_events
  where dedupe_key = nullif(btrim(coalesce(p_dedupe_key, '')), '')
  limit 1;
$$;

create or replace function public.run_want_match_engine_v1(
  p_user_id uuid default null,
  p_limit integer default 500
)
returns table (
  match_id uuid,
  action text,
  want_user_id uuid,
  owner_user_id uuid,
  card_print_id uuid,
  recommended_tier text,
  available_event_id uuid,
  owner_count_event_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 500), 1), 1000);
  v_candidate record;
  v_match public.want_matches%rowtype;
  v_existing_id uuid;
  v_inserted boolean;
  v_available_key text;
  v_owner_key text;
  v_available_event_id uuid;
  v_owner_event_id uuid;
  v_wanted_count integer;
begin
  for v_candidate in
    with users_to_scan as (
      select distinct wi.user_id
      from public.wishlist_items wi
      where p_user_id is null or wi.user_id = p_user_id
      union
      select distinct w.user_id
      from public.watches w
      where w.subject_type = 'card'
        and w.reason = 'want'
        and w.muted_at is null
        and (p_user_id is null or w.user_id = p_user_id)
    ),
    candidates as (
      select
        c.*,
        coalesce(c.vault_item_id, c.instance_id, '00000000-0000-0000-0000-000000000000'::uuid) as source_anchor_id,
        row_number() over (
          partition by c.want_user_id, c.owner_user_id, c.card_print_id,
            coalesce(c.vault_item_id, c.instance_id, '00000000-0000-0000-0000-000000000000'::uuid)
          order by
            case c.source_type when 'wall_card' then 0 else 1 end,
            c.match_strength desc,
            c.source_created_at desc nulls last,
            c.dedupe_key
        ) as source_rank
      from users_to_scan u
      cross join lateral public.local_community_want_match_candidates_v1(u.user_id, v_limit) c
    )
    select *
    from candidates
    where source_rank = 1
    order by want_user_id, match_strength desc, source_created_at desc nulls last, dedupe_key
    limit v_limit
  loop
    v_inserted := false;
    v_available_event_id := null;
    v_owner_event_id := null;

    select wm.id
    into v_existing_id
    from public.want_matches wm
    where wm.want_user_id = v_candidate.want_user_id
      and wm.owner_user_id = v_candidate.owner_user_id
      and wm.card_print_id = v_candidate.card_print_id
      and coalesce(wm.vault_item_id, wm.instance_id, '00000000-0000-0000-0000-000000000000'::uuid) = v_candidate.source_anchor_id
    for update;

    if v_existing_id is null then
      begin
        insert into public.want_matches (
          want_user_id,
          owner_user_id,
          card_print_id,
          vault_item_id,
          instance_id,
          distance_bucket,
          locality_label,
          relationship_context,
          intent,
          source_type,
          match_strength,
          recommended_tier,
          status,
          surfaced_at,
          payload
        ) values (
          v_candidate.want_user_id,
          v_candidate.owner_user_id,
          v_candidate.card_print_id,
          v_candidate.vault_item_id,
          v_candidate.instance_id,
          v_candidate.distance_bucket,
          v_candidate.locality_label,
          v_candidate.relationship_context,
          v_candidate.intent,
          v_candidate.source_type,
          v_candidate.match_strength,
          v_candidate.recommended_tier,
          'active',
          now(),
          jsonb_strip_nulls(jsonb_build_object(
            'gv_id', v_candidate.gv_id,
            'card_name', v_candidate.card_name,
            'set_code', v_candidate.set_code,
            'set_name', v_candidate.set_name,
            'card_number', v_candidate.card_number,
            'owner_slug', v_candidate.owner_slug,
            'owner_display_name', v_candidate.owner_display_name,
            'source_type', v_candidate.source_type,
            'source_dedupe_key', v_candidate.dedupe_key,
            'display_image_url', v_candidate.display_image_url,
            'display_image_kind', v_candidate.display_image_kind
          ))
        )
        returning * into v_match;
        v_inserted := true;
      exception
        when unique_violation then
          select wm.id into v_existing_id
          from public.want_matches wm
          where wm.want_user_id = v_candidate.want_user_id
            and wm.owner_user_id = v_candidate.owner_user_id
            and wm.card_print_id = v_candidate.card_print_id
            and coalesce(wm.vault_item_id, wm.instance_id, '00000000-0000-0000-0000-000000000000'::uuid) = v_candidate.source_anchor_id
          for update;
      end;
    end if;

    if not v_inserted then
      update public.want_matches wm
      set last_seen_available_at = now(),
          distance_bucket = v_candidate.distance_bucket,
          locality_label = v_candidate.locality_label,
          relationship_context = v_candidate.relationship_context,
          intent = v_candidate.intent,
          source_type = v_candidate.source_type,
          match_strength = v_candidate.match_strength,
          recommended_tier = v_candidate.recommended_tier,
          status = case when wm.status = 'stale' then 'active' else wm.status end,
          stale_marked_at = case when wm.status = 'stale' then null else wm.stale_marked_at end,
          payload = wm.payload || jsonb_strip_nulls(jsonb_build_object(
            'gv_id', v_candidate.gv_id,
            'card_name', v_candidate.card_name,
            'set_code', v_candidate.set_code,
            'set_name', v_candidate.set_name,
            'card_number', v_candidate.card_number,
            'owner_slug', v_candidate.owner_slug,
            'owner_display_name', v_candidate.owner_display_name,
            'source_type', v_candidate.source_type,
            'source_dedupe_key', v_candidate.dedupe_key,
            'display_image_url', v_candidate.display_image_url,
            'display_image_kind', v_candidate.display_image_kind
          ))
      where wm.id = v_existing_id
      returning * into v_match;
    end if;

    if v_inserted then
      v_available_key := 'want_match_available:' || v_match.id::text;
      v_owner_key := 'want_match_owner_count:' || v_match.id::text;

      select count(*)::integer
      into v_wanted_count
      from public.want_matches wm
      where wm.owner_user_id = v_match.owner_user_id
        and wm.card_print_id = v_match.card_print_id
        and wm.status = 'active';

      v_available_event_id := public.interest_graph_emit_event_v1(
        'e3_want_match_engine',
        'want_match_available',
        v_match.card_print_id,
        v_match.owner_user_id,
        v_match.want_user_id,
        jsonb_strip_nulls(v_match.payload || jsonb_build_object(
          'want_match_id', v_match.id,
          'distance_bucket', v_match.distance_bucket,
          'intent', v_match.intent,
          'owner_slug', v_match.payload ->> 'owner_slug',
          'recommended_tier', v_match.recommended_tier,
          'match_strength', v_match.match_strength
        )),
        'private',
        v_available_key
      );
      if v_available_event_id is null then
        v_available_event_id := public.want_match_resolve_event_id_v1(v_available_key);
      end if;

      v_owner_event_id := public.interest_graph_emit_event_v1(
        'e3_want_match_engine',
        'want_match_owner_count',
        v_match.card_print_id,
        v_match.want_user_id,
        v_match.owner_user_id,
        jsonb_strip_nulls(jsonb_build_object(
          'want_match_id', v_match.id,
          'wanted_count_for_card', v_wanted_count,
          'distance_bucket', v_match.distance_bucket,
          'recommended_tier', v_match.recommended_tier
        )),
        'private',
        v_owner_key
      );
      if v_owner_event_id is null then
        v_owner_event_id := public.want_match_resolve_event_id_v1(v_owner_key);
      end if;
    end if;

    match_id := v_match.id;
    action := case when v_inserted then 'inserted' else 'seen' end;
    want_user_id := v_match.want_user_id;
    owner_user_id := v_match.owner_user_id;
    card_print_id := v_match.card_print_id;
    recommended_tier := v_match.recommended_tier;
    available_event_id := v_available_event_id;
    owner_count_event_id := v_owner_event_id;
    return next;
  end loop;
end;
$$;

comment on function public.run_want_match_engine_v1(uuid, integer) is
'E3 PR2 service-role durable want-match job. Upserts candidates from local_community_want_match_candidates_v1, emits wanter-side want_match_available and owner-side want_match_owner_count card_events for newly inserted matches, and never writes notification_outbox.';

create or replace function public.mark_stale_want_matches_v1(
  p_user_id uuid default null,
  p_limit integer default 1000
)
returns table (
  match_id uuid,
  want_user_id uuid,
  owner_user_id uuid,
  card_print_id uuid,
  stale_marked_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 1000), 1), 5000);
begin
  return query
  with stale_candidates as (
    select wm.*
    from public.want_matches wm
    where wm.status = 'active'
      and wm.last_seen_available_at < now() - interval '7 days'
      and (p_user_id is null or wm.want_user_id = p_user_id)
      and not exists (
        select 1
        from public.local_community_want_match_candidates_v1(wm.want_user_id, 1000) c
        where c.owner_user_id = wm.owner_user_id
          and c.card_print_id = wm.card_print_id
          and coalesce(c.vault_item_id, c.instance_id, '00000000-0000-0000-0000-000000000000'::uuid)
            = coalesce(wm.vault_item_id, wm.instance_id, '00000000-0000-0000-0000-000000000000'::uuid)
      )
    order by wm.last_seen_available_at asc
    limit v_limit
    for update
  ),
  updated as (
    update public.want_matches wm
    set status = 'stale',
        stale_marked_at = now(),
        payload = wm.payload || jsonb_build_object(
          'stale_reason', 'source_not_visible_after_grace',
          'stale_grace_days', 7
        )
    from stale_candidates sc
    where wm.id = sc.id
    returning wm.id, wm.want_user_id, wm.owner_user_id, wm.card_print_id, wm.stale_marked_at
  )
  select updated.id, updated.want_user_id, updated.owner_user_id, updated.card_print_id, updated.stale_marked_at
  from updated;
end;
$$;

comment on function public.mark_stale_want_matches_v1(uuid, integer) is
'E3 PR2 stale cleanup. Marks active want_matches stale only after last_seen_available_at is older than 7 days and the source candidate is no longer visible. It never hard-deletes matches.';

create or replace function public.want_matches_for_viewer_v1(
  p_limit integer default 50
)
returns table (
  want_match_id uuid,
  card_print_id uuid,
  gv_id text,
  card_name text,
  set_code text,
  set_name text,
  card_number text,
  owner_slug text,
  owner_display_name text,
  distance_bucket text,
  locality_label text,
  intent text,
  display_image_url text,
  display_image_kind text,
  match_strength double precision,
  recommended_tier text,
  status text,
  first_seen_available_at timestamptz,
  last_seen_available_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  return query
  select
    wm.id as want_match_id,
    wm.card_print_id,
    cp.gv_id,
    cp.name as card_name,
    cp.set_code,
    s.name as set_name,
    cp.number as card_number,
    pp.slug as owner_slug,
    pp.display_name as owner_display_name,
    wm.distance_bucket,
    wm.locality_label,
    wm.intent,
    coalesce(wm.payload ->> 'display_image_url', cp.image_url, cp.image_alt_url, cp.representative_image_url) as display_image_url,
    coalesce(wm.payload ->> 'display_image_kind', case
      when nullif(btrim(coalesce(cp.image_url, cp.image_alt_url)), '') is not null then 'exact'
      when nullif(btrim(cp.representative_image_url), '') is not null then 'representative'
      else 'missing'
    end) as display_image_kind,
    wm.match_strength,
    wm.recommended_tier,
    wm.status,
    wm.first_seen_available_at,
    wm.last_seen_available_at
  from public.want_matches wm
  join public.card_prints cp
    on cp.id = wm.card_print_id
  left join public.sets s
    on s.id = cp.set_id
  join public.public_profiles pp
    on pp.user_id = wm.owner_user_id
  where wm.want_user_id = v_uid
  order by
    case wm.status when 'active' then 0 when 'stale' then 1 else 2 end,
    wm.match_strength desc,
    wm.last_seen_available_at desc,
    wm.id desc
  limit v_limit;
end;
$$;

revoke all on function public.want_match_resolve_event_id_v1(text) from public, anon, authenticated;
revoke all on function public.run_want_match_engine_v1(uuid, integer) from public, anon, authenticated;
revoke all on function public.mark_stale_want_matches_v1(uuid, integer) from public, anon, authenticated;
revoke all on function public.want_matches_for_viewer_v1(integer) from public, anon;

grant execute on function public.want_match_resolve_event_id_v1(text) to service_role;
grant execute on function public.run_want_match_engine_v1(uuid, integer) to service_role;
grant execute on function public.mark_stale_want_matches_v1(uuid, integer) to service_role;
grant execute on function public.want_matches_for_viewer_v1(integer) to authenticated, service_role;

commit;
