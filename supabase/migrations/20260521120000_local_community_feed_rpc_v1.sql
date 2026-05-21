begin;

create or replace function public.local_community_feed_v1(
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
  with viewer_setting as (
    select
      s.user_id,
      s.local_discovery_enabled,
      s.area_label,
      s.region_code,
      s.country_code,
      s.geohash_prefix
    from public.collector_local_discovery_settings s
    where s.user_id = v_uid
      and s.local_discovery_enabled is true
    limit 1
  ),
  source_rows as (
    select
      'wall_card'::text as source_type,
      w.owner_user_id,
      w.owner_slug,
      w.owner_display_name,
      w.gv_id,
      w.name as card_name,
      w.set_code,
      w.set_name,
      w.number as card_number,
      w.intent,
      w.display_image_url as image_url,
      w.display_image_kind,
      w.created_at
    from public.v_wall_cards_v1 w
    union all
    select
      coalesce(nullif(btrim(s.intent), ''), 'network_card')::text as source_type,
      s.owner_user_id,
      s.owner_slug,
      s.owner_display_name,
      s.gv_id,
      s.name as card_name,
      s.set_code,
      s.set_name,
      s.number as card_number,
      s.intent,
      s.display_image_url as image_url,
      s.display_image_kind,
      s.created_at
    from public.v_card_stream_v1 s
  ),
  eligible as (
    select
      sr.*,
      pp.avatar_path as owner_avatar_path,
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
      end as distance_bucket,
      case
        when exists (
          select 1
          from public.collector_follows cf
          where cf.follower_user_id = v_uid
            and cf.followed_user_id = sr.owner_user_id
        ) then 'following'
        else 'not_following'
      end as relationship_context
    from viewer_setting vs
    join source_rows sr
      on sr.owner_user_id <> v_uid
    join public.collector_local_discovery_settings owner_setting
      on owner_setting.user_id = sr.owner_user_id
     and owner_setting.local_discovery_enabled is true
     and owner_setting.country_code = vs.country_code
    join public.public_profiles pp
      on pp.user_id = sr.owner_user_id
     and pp.public_profile_enabled is true
     and pp.vault_sharing_enabled is true
    where public.local_community_collectors_are_blocked_v1(v_uid, sr.owner_user_id) is false
      and not exists (
        select 1
        from public.collector_local_mutes m
        where m.muter_user_id = v_uid
          and m.muted_user_id = sr.owner_user_id
          and (m.expires_at is null or m.expires_at > now())
      )
  ),
  matched as (
    select *
    from eligible
    where distance_bucket is not null
  ),
  ranked as (
    select
      m.*,
      row_number() over (
        partition by
          m.source_type,
          m.owner_slug,
          m.gv_id,
          coalesce(m.intent, '')
        order by m.created_at desc, m.owner_slug
      ) as duplicate_rank
    from matched m
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
    coalesce(nullif(btrim(ranked.owner_display_name), ''), ranked.owner_slug) as owner_display_name,
    ranked.owner_avatar_path,
    ranked.gv_id,
    ranked.card_name,
    ranked.set_code,
    ranked.set_name,
    ranked.card_number,
    ranked.intent,
    ranked.image_url,
    ranked.display_image_kind,
    coalesce(nullif(btrim(ranked.owner_area_label), ''), case ranked.distance_bucket
      when 'nearby' then 'Nearby'
      else 'Same region'
    end) as locality_label,
    ranked.distance_bucket,
    ranked.relationship_context,
    ranked.created_at,
    case
      when nullif(btrim(ranked.gv_id), '') is not null then '/card/' || ranked.gv_id
      else null
    end as route_target
  from ranked
  where ranked.duplicate_rank = 1
  order by
    case ranked.relationship_context when 'following' then 0 else 1 end,
    case ranked.distance_bucket when 'nearby' then 0 else 1 end,
    ranked.created_at desc nulls last,
    ranked.owner_slug,
    ranked.gv_id
  limit v_limit;
end;
$$;

comment on function public.local_community_feed_v1(integer) is
'LOCAL_COMMUNITY_FEED_V1 authenticated nearby feed RPC. Uses auth.uid(), emits no raw user IDs or exact location, and excludes blocks/mutes.';

revoke all on function public.local_community_feed_v1(integer) from public, anon;
grant execute on function public.local_community_feed_v1(integer) to authenticated;

commit;
