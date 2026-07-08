begin;

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

comment on function public.local_community_collector_visible_to_viewer_v1(uuid, uuid) is
'Shared local-community collector visibility gate. Reuses E1/E3 profile, vault-sharing, block, and mute predicates for local_community_feed_v2, want-match, and E5 Card Journeys.';

revoke all on function public.local_community_collector_visible_to_viewer_v1(uuid, uuid) from public, anon, authenticated;
grant execute on function public.local_community_collector_visible_to_viewer_v1(uuid, uuid) to authenticated, service_role;

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
  with viewer_setting as (
    select
      s.user_id,
      s.local_discovery_enabled,
      s.area_label,
      s.region_code,
      s.country_code,
      s.geohash_prefix
    from public.collector_local_discovery_settings s
    where s.user_id = p_viewer_user_id
      and s.local_discovery_enabled is true
    limit 1
  ),
  source_rows as (
    select
      'wall_card'::text as source_type,
      w.owner_user_id,
      w.owner_slug,
      w.owner_display_name,
      w.card_print_id,
      w.gv_id,
      w.name as card_name,
      w.set_code,
      w.set_name,
      w.number as card_number,
      w.intent,
      w.display_image_url as raw_image_url,
      w.display_image_kind,
      w.created_at,
      w.vault_item_id,
      w.instance_id
    from public.v_wall_cards_v1 w
    union all
    select
      coalesce(nullif(btrim(s.intent), ''), 'network_card')::text as source_type,
      s.owner_user_id,
      s.owner_slug,
      s.owner_display_name,
      s.card_print_id,
      s.gv_id,
      s.name as card_name,
      s.set_code,
      s.set_name,
      s.number as card_number,
      s.intent,
      s.display_image_url as raw_image_url,
      s.display_image_kind,
      s.created_at,
      s.vault_item_id,
      null::uuid as instance_id
    from public.v_card_stream_v1 s
  ),
  eligible as (
    select
      sr.*,
      case
        when nullif(btrim(pp.avatar_path), '') ~* '^https?://' then pp.avatar_path
        else null::text
      end as safe_owner_avatar_path,
      case
        when nullif(btrim(sr.raw_image_url), '') ~* '^https?://' then sr.raw_image_url
        else null::text
      end as safe_image_url,
      owner_setting.area_label as owner_area_label,
      case
        when nullif(btrim(vs.geohash_prefix), '') is not null
          and nullif(btrim(owner_setting.geohash_prefix), '') is not null
          and vs.geohash_prefix = owner_setting.geohash_prefix
          then 'nearby'
        when nullif(btrim(vs.region_code), '') is not null
          and vs.region_code = owner_setting.region_code
          then 'same_region'
        else null
      end as local_distance_bucket,
      case
        when exists (
          select 1
          from public.collector_follows cf
          where cf.follower_user_id = p_viewer_user_id
            and cf.followed_user_id = sr.owner_user_id
        ) then 'following'
        else 'not_following'
      end as local_relationship_context,
      exists (
        select 1
        from public.wishlist_items wi
        where wi.user_id = p_viewer_user_id
          and wi.card_id = sr.card_print_id
      ) as local_viewer_wishlist_match
    from viewer_setting vs
    join source_rows sr
      on sr.owner_user_id <> p_viewer_user_id
    join public.collector_local_discovery_settings owner_setting
      on owner_setting.user_id = sr.owner_user_id
     and owner_setting.local_discovery_enabled is true
     and owner_setting.country_code = vs.country_code
    join public.public_profiles pp
      on pp.user_id = sr.owner_user_id
    where public.local_community_collector_visible_to_viewer_v1(p_viewer_user_id, sr.owner_user_id) is true
  ),
  scored as (
    select
      e.*,
      least(1.0, greatest(0.0,
        case e.local_distance_bucket
          when 'nearby' then 0.70
          when 'same_region' then 0.48
          else 0.00
        end
        + case coalesce(nullif(btrim(e.intent), ''), e.source_type)
          when 'trade' then 0.20
          when 'sell' then 0.10
          else 0.00
        end
        + case e.local_relationship_context
          when 'following' then 0.03
          else 0.00
        end
        - least(0.10, greatest(0.0,
          extract(epoch from (now() - coalesce(e.created_at, now()))) / (30.0 * 86400.0) * 0.10
        ))
      ))::double precision as deterministic_match_strength
    from eligible e
    where e.local_distance_bucket is not null
  )
  select
    scored.source_type,
    scored.owner_user_id,
    scored.owner_slug,
    coalesce(nullif(btrim(scored.owner_display_name), ''), scored.owner_slug) as owner_display_name,
    scored.safe_owner_avatar_path as owner_avatar_path,
    scored.card_print_id,
    scored.gv_id,
    scored.card_name,
    scored.set_code,
    scored.set_name,
    scored.card_number,
    scored.intent,
    scored.safe_image_url as image_url,
    case
      when scored.safe_image_url is null then 'missing'
      else scored.display_image_kind
    end as display_image_kind,
    coalesce(nullif(btrim(scored.owner_area_label), ''), case scored.local_distance_bucket
      when 'nearby' then 'Nearby'
      else 'Same region'
    end) as locality_label,
    scored.local_distance_bucket as distance_bucket,
    scored.local_relationship_context as relationship_context,
    scored.local_viewer_wishlist_match as viewer_wishlist_match,
    scored.created_at,
    case
      when nullif(btrim(scored.gv_id), '') is not null then '/card/' || scored.gv_id
      else null
    end as route_target,
    scored.vault_item_id,
    scored.instance_id,
    scored.deterministic_match_strength as score,
    scored.deterministic_match_strength as match_strength,
    case
      when scored.local_distance_bucket = 'nearby'
        and scored.intent = 'trade'
        and scored.deterministic_match_strength >= 0.85
        then 'instant'
      else 'digest'
    end as recommended_tier,
    concat_ws(
      ':',
      'want_match_candidate',
      p_viewer_user_id::text,
      scored.owner_user_id::text,
      scored.card_print_id::text,
      coalesce(scored.instance_id::text, scored.vault_item_id::text, scored.source_type, 'source')
    ) as dedupe_key
  from scored;
$$;

comment on function public.local_community_visible_source_cards_v1(uuid) is
'E3 PR1 private helper. Shared local-community visibility, geofence, block/mute, profile/vault-sharing, and viewer-wishlist predicate used by local_community_feed_v2, want-match candidates, and E5 Card Journeys. Match strength formula: distance base nearby=0.70/same_region=0.48 + intent bonus trade=0.20/sell=0.10 + following bonus=0.03 - recency decay up to 0.10 over 30 days; clamped 0..1.';

revoke all on function public.local_community_visible_source_cards_v1(uuid) from public, anon, authenticated;

create or replace function public.card_journey_public_copy_sources_v1(
  p_viewer_user_id uuid,
  p_card_print_id uuid
)
returns table (
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
  display_image_url text,
  display_image_kind text,
  locality_label text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    vii.user_id as owner_user_id,
    pp.slug as owner_slug,
    coalesce(nullif(btrim(pp.display_name), ''), pp.slug) as owner_display_name,
    case
      when nullif(btrim(pp.avatar_path), '') ~* '^https?://' then pp.avatar_path
      else null::text
    end as owner_avatar_path,
    cp.id as card_print_id,
    cp.gv_id,
    cp.name as card_name,
    cp.set_code,
    sets.name as set_name,
    cp.number as card_number,
    nullif(btrim(vii.intent), '') as intent,
    nullif(btrim(coalesce(
      case when vii.image_display_mode = 'uploaded' then vii.photo_url end,
      case when vii.image_display_mode = 'uploaded' then vii.image_url end,
      cp.image_url,
      cp.image_alt_url,
      cp.representative_image_url
    )), '') as display_image_url,
    case
      when vii.image_display_mode = 'uploaded'
        and nullif(btrim(coalesce(vii.photo_url, vii.image_url)), '') is not null then 'exact'
      when nullif(btrim(coalesce(cp.image_url, cp.image_alt_url)), '') is not null then 'exact'
      when nullif(btrim(cp.representative_image_url), '') is not null then 'representative'
      else 'missing'
    end as display_image_kind,
    case
      when settings.local_discovery_enabled is true then nullif(btrim(settings.area_label), '')
      else null::text
    end as locality_label,
    vii.created_at
  from public.vault_item_instances vii
  left join public.slab_certs slab
    on slab.id = vii.slab_cert_id
  join public.card_prints cp
    on cp.id = coalesce(vii.card_print_id, slab.card_print_id)
  left join public.sets
    on sets.id = cp.set_id
  join public.public_profiles pp
    on pp.user_id = vii.user_id
  left join public.collector_local_discovery_settings settings
    on settings.user_id = vii.user_id
  where p_viewer_user_id is not null
    and p_card_print_id is not null
    and cp.id = p_card_print_id
    and vii.archived_at is null
    and public.local_community_collector_visible_to_viewer_v1(p_viewer_user_id, vii.user_id) is true;
$$;

comment on function public.card_journey_public_copy_sources_v1(uuid, uuid) is
'Internal E5 Card Journeys public-copy source. Exact card_print_id only; reuses the shared local-community collector visibility gate and emits no vault item ids.';

revoke all on function public.card_journey_public_copy_sources_v1(uuid, uuid) from public, anon, authenticated;
grant execute on function public.card_journey_public_copy_sources_v1(uuid, uuid) to service_role;

create or replace function public.card_journey_snapshot_v1(
  p_card_print_id uuid
)
returns table (
  card_print_id uuid,
  owner_collector_count integer,
  trade_collector_count integer,
  sale_collector_count integer,
  want_collector_count integer,
  moment_count integer,
  geography_area_count integer,
  has_public_activity boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  return query
  with copies as (
    select *
    from public.card_journey_public_copy_sources_v1(v_uid, p_card_print_id)
  ),
  wants as (
    select count(distinct wi.user_id)::integer as total
    from public.wishlist_items wi
    join public.public_profiles pp
      on pp.user_id = wi.user_id
     and pp.public_profile_enabled is true
    where wi.card_id = p_card_print_id
      and wi.user_id <> v_uid
      and public.local_community_collectors_are_blocked_v1(v_uid, wi.user_id) is false
      and not exists (
        select 1
        from public.collector_local_mutes m
        where m.muter_user_id = v_uid
          and m.muted_user_id = wi.user_id
          and (m.expires_at is null or m.expires_at > now())
      )
  ),
  moments as (
    select count(*)::integer as total
    from public.card_journey_moments_v1(p_card_print_id, 50, null, null)
  ),
  geography as (
    select count(distinct c.locality_label)::integer as total
    from copies c
    where nullif(btrim(c.locality_label), '') is not null
  )
  select
    p_card_print_id as card_print_id,
    count(distinct c.owner_user_id)::integer as owner_collector_count,
    count(distinct c.owner_user_id) filter (where c.intent = 'trade')::integer as trade_collector_count,
    count(distinct c.owner_user_id) filter (where c.intent = 'sell')::integer as sale_collector_count,
    coalesce((select wants.total from wants), 0)::integer as want_collector_count,
    coalesce((select moments.total from moments), 0)::integer as moment_count,
    case
      when coalesce((select geography.total from geography), 0) >= 2
      then (select geography.total from geography)
      else 0
    end::integer as geography_area_count,
    (
      count(distinct c.owner_user_id) > 0
      or coalesce((select wants.total from wants), 0) > 0
      or coalesce((select moments.total from moments), 0) > 0
      or coalesce((select geography.total from geography), 0) >= 2
    ) as has_public_activity
  from copies c;
end;
$$;

comment on function public.card_journey_snapshot_v1(uuid) is
'E5 Card Journeys authenticated snapshot RPC. Counts public owners/intents, aggregate-only public-profile wants, moment count, and geography availability. Empty copy belongs in the app.';

revoke all on function public.card_journey_snapshot_v1(uuid) from public, anon;
grant execute on function public.card_journey_snapshot_v1(uuid) to authenticated, service_role;

create or replace function public.card_journey_collectors_v1(
  p_card_print_id uuid,
  p_kind text default 'owners',
  p_limit integer default 20,
  p_after_created_at timestamptz default null,
  p_after_user_id uuid default null
)
returns table (
  owner_user_id uuid,
  owner_slug text,
  owner_display_name text,
  owner_avatar_path text,
  intent text,
  copy_count integer,
  contact_available boolean,
  created_at timestamptz,
  next_cursor_created_at timestamptz,
  next_cursor_user_id uuid
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_kind text := lower(btrim(coalesce(p_kind, 'owners')));
  v_limit integer := least(greatest(coalesce(p_limit, 20), 1), 50);
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if v_kind not in ('owners', 'trade', 'sale') then
    raise exception 'invalid_card_journey_collector_kind' using errcode = '22023';
  end if;

  return query
  with grouped as (
    select
      c.owner_user_id,
      max(c.owner_slug) as owner_slug,
      max(c.owner_display_name) as owner_display_name,
      max(c.owner_avatar_path) as owner_avatar_path,
      case
        when bool_or(c.intent = 'trade') then 'trade'
        when bool_or(c.intent = 'sell') then 'sell'
        when bool_or(c.intent = 'showcase') then 'showcase'
        else 'hold'
      end as intent,
      count(*)::integer as copy_count,
      bool_or(c.intent in ('trade', 'sell')) as contact_available,
      max(c.created_at) as created_at
    from public.card_journey_public_copy_sources_v1(v_uid, p_card_print_id) c
    where (
      v_kind = 'owners'
      or (v_kind = 'trade' and c.intent = 'trade')
      or (v_kind = 'sale' and c.intent = 'sell')
    )
    group by c.owner_user_id
  ),
  page as (
    select *
    from grouped g
    where (
      p_after_created_at is null
      or p_after_user_id is null
      or g.created_at < p_after_created_at
      or (g.created_at = p_after_created_at and g.owner_user_id < p_after_user_id)
    )
    order by g.created_at desc, g.owner_user_id desc
    limit v_limit
  ),
  cursor_row as (
    select p.created_at, p.owner_user_id
    from page p
    order by p.created_at asc, p.owner_user_id asc
    limit 1
  )
  select
    page.owner_user_id,
    page.owner_slug,
    page.owner_display_name,
    page.owner_avatar_path,
    page.intent,
    page.copy_count,
    page.contact_available,
    page.created_at,
    cursor_row.created_at as next_cursor_created_at,
    cursor_row.owner_user_id as next_cursor_user_id
  from page
  cross join cursor_row
  order by page.created_at desc, page.owner_user_id desc;
end;
$$;

comment on function public.card_journey_collectors_v1(uuid, text, integer, timestamptz, uuid) is
'E5 Card Journeys authenticated collector list RPC. V1 supports owners, trade, and sale only; wants are aggregate-only because no public-want gate exists.';

revoke all on function public.card_journey_collectors_v1(uuid, text, integer, timestamptz, uuid) from public, anon;
grant execute on function public.card_journey_collectors_v1(uuid, text, integer, timestamptz, uuid) to authenticated, service_role;

create or replace function public.card_journey_moments_v1(
  p_card_print_id uuid,
  p_limit integer default 5,
  p_after_created_at timestamptz default null,
  p_after_event_id uuid default null
)
returns table (
  event_id uuid,
  event_type text,
  created_at timestamptz,
  actor_slug text,
  actor_display_name text,
  actor_avatar_path text,
  card_print_id uuid,
  moment_line text,
  next_cursor_created_at timestamptz,
  next_cursor_event_id uuid
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_limit integer := least(greatest(coalesce(p_limit, 5), 1), 50);
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  return query
  with eligible as (
    select
      e.id as event_id,
      e.event_type,
      e.created_at,
      pp.slug as actor_slug,
      coalesce(nullif(btrim(pp.display_name), ''), pp.slug) as actor_display_name,
      case
        when nullif(btrim(pp.avatar_path), '') ~* '^https?://' then pp.avatar_path
        else null::text
      end as actor_avatar_path,
      e.card_print_id,
      cp.name as card_name,
      case
        when e.event_type = 'vault_added' then
          coalesce(nullif(btrim(pp.display_name), ''), pp.slug, 'A collector') || ' added ' || coalesce(cp.name, 'this card')
        when e.event_type = 'set_completion_crossed' then
          coalesce(nullif(btrim(pp.display_name), ''), pp.slug, 'A collector') || ' crossed a set milestone'
        when e.event_type = 'dex_completion_crossed' then
          coalesce(nullif(btrim(pp.display_name), ''), pp.slug, 'A collector') || ' crossed a Dex milestone'
        else
          coalesce(nullif(btrim(pp.display_name), ''), pp.slug, 'A collector') || ' updated this card'
      end as moment_line,
      row_number() over (
        partition by coalesce(nullif(e.payload ->> 'gvvi_id', ''), e.id::text)
        order by
          case when e.event_type = 'vault_added' then 0 else 1 end,
          e.created_at desc,
          e.id desc
      ) as event_rank
    from public.card_events e
    left join public.public_profiles pp
      on pp.user_id = e.actor_user_id
    left join public.card_prints cp
      on cp.id = e.card_print_id
    where e.card_print_id = p_card_print_id
      and e.event_type in ('vault_added', 'set_completion_crossed', 'dex_completion_crossed')
      and public.interest_graph_card_event_visible_to_viewer_v1(
        v_uid,
        e.actor_user_id,
        e.subject_user_id,
        e.visibility
      ) is true
  ),
  page as (
    select *
    from eligible e
    where e.event_rank = 1
      and (
        p_after_created_at is null
        or p_after_event_id is null
        or e.created_at < p_after_created_at
        or (e.created_at = p_after_created_at and e.event_id < p_after_event_id)
      )
    order by e.created_at desc, e.event_id desc
    limit v_limit
  ),
  cursor_row as (
    select p.created_at, p.event_id
    from page p
    order by p.created_at asc, p.event_id asc
    limit 1
  )
  select
    page.event_id,
    page.event_type,
    page.created_at,
    page.actor_slug,
    page.actor_display_name,
    page.actor_avatar_path,
    page.card_print_id,
    page.moment_line,
    cursor_row.created_at as next_cursor_created_at,
    cursor_row.event_id as next_cursor_event_id
  from page
  cross join cursor_row
  order by page.created_at desc, page.event_id desc;
end;
$$;

comment on function public.card_journey_moments_v1(uuid, integer, timestamptz, uuid) is
'E5 Card Journeys authenticated moments RPC. Returns display-safe fields only; no payload jsonb. Consumes base public vault_added and completion events only; scanner enriched private twins are excluded.';

revoke all on function public.card_journey_moments_v1(uuid, integer, timestamptz, uuid) from public, anon;
grant execute on function public.card_journey_moments_v1(uuid, integer, timestamptz, uuid) to authenticated, service_role;

create or replace function public.card_journey_geography_v1(
  p_card_print_id uuid
)
returns table (
  area_label text,
  collector_count integer,
  last_public_activity_at timestamptz,
  rank integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  return query
  with grouped as (
    select
      c.locality_label as area_label,
      count(distinct c.owner_user_id)::integer as collector_count,
      max(c.created_at) as last_public_activity_at
    from public.card_journey_public_copy_sources_v1(v_uid, p_card_print_id) c
    where nullif(btrim(c.locality_label), '') is not null
    group by c.locality_label
  ),
  area_count as (
    select count(*)::integer as total
    from grouped
  ),
  ranked as (
    select
      grouped.*,
      row_number() over (order by grouped.last_public_activity_at desc, grouped.area_label) as rank
    from grouped
  )
  select
    ranked.area_label,
    ranked.collector_count,
    ranked.last_public_activity_at,
    ranked.rank::integer
  from ranked
  where (select area_count.total from area_count) >= 2
  order by ranked.rank;
end;
$$;

comment on function public.card_journey_geography_v1(uuid) is
'E5 Card Journeys authenticated geography RPC. Uses collector_local_discovery_settings.area_label, the same source as E3 feed locality_label. Aggregate only; returns no collector/copy identifiers and only emits when at least two distinct areas exist.';

revoke all on function public.card_journey_geography_v1(uuid) from public, anon;
grant execute on function public.card_journey_geography_v1(uuid) to authenticated, service_role;

commit;
