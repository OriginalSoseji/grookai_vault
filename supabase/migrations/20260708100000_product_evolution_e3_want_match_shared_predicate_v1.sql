begin;

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
     and pp.public_profile_enabled is true
     and pp.vault_sharing_enabled is true
    where public.local_community_collectors_are_blocked_v1(p_viewer_user_id, sr.owner_user_id) is false
      and not exists (
        select 1
        from public.collector_local_mutes m
        where m.muter_user_id = p_viewer_user_id
          and m.muted_user_id = sr.owner_user_id
          and (m.expires_at is null or m.expires_at > now())
      )
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
'E3 PR1 private helper. Shared local-community visibility, geofence, block/mute, profile/vault-sharing, and viewer-wishlist predicate used by local_community_feed_v2 and want-match candidates. Match strength formula: distance base nearby=0.70/same_region=0.48 + intent bonus trade=0.20/sell=0.10 + following bonus=0.03 - recency decay up to 0.10 over 30 days; clamped 0..1.';

revoke all on function public.local_community_visible_source_cards_v1(uuid) from public, anon, authenticated;

create or replace function public.local_community_want_match_candidates_v1(
  p_viewer_user_id uuid,
  p_limit integer default 500
)
returns table (
  want_user_id uuid,
  owner_user_id uuid,
  owner_slug text,
  owner_display_name text,
  card_print_id uuid,
  gv_id text,
  card_name text,
  set_code text,
  set_name text,
  card_number text,
  source_type text,
  vault_item_id uuid,
  instance_id uuid,
  intent text,
  distance_bucket text,
  relationship_context text,
  locality_label text,
  display_image_url text,
  display_image_kind text,
  source_created_at timestamptz,
  score double precision,
  match_strength double precision,
  recommended_tier text,
  dedupe_key text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 500), 1), 1000);
begin
  if p_viewer_user_id is null then
    raise exception 'viewer_required' using errcode = '22023';
  end if;

  if coalesce(auth.role(), '') <> 'service_role'
     and auth.uid() is distinct from p_viewer_user_id then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  return query
  select
    p_viewer_user_id as want_user_id,
    src.owner_user_id,
    src.owner_slug,
    src.owner_display_name,
    src.card_print_id,
    src.gv_id,
    src.card_name,
    src.set_code,
    src.set_name,
    src.card_number,
    src.source_type,
    src.vault_item_id,
    src.instance_id,
    src.intent,
    src.distance_bucket,
    src.relationship_context,
    src.locality_label,
    src.image_url as display_image_url,
    src.display_image_kind,
    src.created_at as source_created_at,
    src.score,
    src.match_strength,
    src.recommended_tier,
    src.dedupe_key
  from public.local_community_visible_source_cards_v1(p_viewer_user_id) src
  where src.viewer_wishlist_match is true
  order by
    case src.distance_bucket when 'nearby' then 0 else 1 end,
    case coalesce(nullif(btrim(src.intent), ''), src.source_type)
      when 'trade' then 0
      when 'sell' then 1
      else 2
    end,
    case src.relationship_context when 'following' then 0 else 1 end,
    src.match_strength desc,
    src.created_at desc nulls last,
    src.owner_slug,
    src.gv_id,
    src.dedupe_key
  limit v_limit;
end;
$$;

comment on function public.local_community_want_match_candidates_v1(uuid, integer) is
'E3 PR1 shared want-match candidate RPC. Uses the same private local-community predicate as local_community_feed_v2. Authenticated callers may request only their own viewer id; service_role may run future jobs. No p_include_existing parameter: durable match suppression belongs in PR2.';

revoke all on function public.local_community_want_match_candidates_v1(uuid, integer) from public, anon;
grant execute on function public.local_community_want_match_candidates_v1(uuid, integer) to authenticated, service_role;

create or replace function public.local_community_feed_v2(
  p_limit integer default 40
)
returns table (
  feed_item_id text,
  source_type text,
  owner_slug text,
  owner_display_name text,
  owner_avatar_path text,
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
  match_reason text,
  created_at timestamptz,
  route_target text
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
  with visible as (
    select *
    from public.local_community_visible_source_cards_v1(v_uid)
  ),
  ranked as (
    select
      v.*,
      row_number() over (
        partition by
          v.source_type,
          v.owner_slug,
          v.gv_id,
          coalesce(v.intent, '')
        order by v.created_at desc, v.owner_slug
      ) as duplicate_rank
    from visible v
  )
  select
    md5(concat_ws(
      ':',
      ranked.source_type,
      ranked.owner_slug,
      ranked.gv_id,
      coalesce(ranked.intent, ''),
      ranked.created_at::text
    )) as feed_item_id,
    ranked.source_type,
    ranked.owner_slug,
    ranked.owner_display_name,
    ranked.owner_avatar_path,
    ranked.gv_id,
    ranked.card_name,
    ranked.set_code,
    ranked.set_name,
    ranked.card_number,
    ranked.intent,
    ranked.image_url,
    ranked.display_image_kind,
    ranked.locality_label,
    ranked.distance_bucket,
    ranked.relationship_context,
    ranked.viewer_wishlist_match,
    case
      when ranked.viewer_wishlist_match is true then 'viewer_wishlist'
      else null::text
    end as match_reason,
    ranked.created_at,
    ranked.route_target
  from ranked
  where ranked.duplicate_rank = 1
  order by
    case ranked.relationship_context when 'following' then 0 else 1 end,
    case when ranked.viewer_wishlist_match is true then 0 else 1 end,
    case ranked.distance_bucket when 'nearby' then 0 else 1 end,
    ranked.created_at desc nulls last,
    ranked.owner_slug,
    ranked.gv_id
  limit v_limit;
end;
$$;

comment on function public.local_community_feed_v2(integer) is
'LOCAL_COMMUNITY_FEED_V2 authenticated nearby feed RPC. Uses auth.uid(), emits no raw user IDs, exact location, wishlist row IDs, private wishlist metadata, or private card IDs; derives wishlist match metadata from E3 shared local-community predicate. Signature and output shape are unchanged.';

revoke all on function public.local_community_feed_v2(integer) from public, anon;
grant execute on function public.local_community_feed_v2(integer) to authenticated;

commit;
