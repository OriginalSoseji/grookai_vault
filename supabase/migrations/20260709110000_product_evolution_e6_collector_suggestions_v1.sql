begin;

create or replace function public.onboarding_collector_suggestions_v1(
  p_limit integer default 3
)
returns table (
  collector_user_id uuid,
  display_name text,
  avatar_url text,
  proximity_label text,
  overlap_summary text,
  sample_image_url text,
  sample_card_count integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_limit integer := least(greatest(coalesce(p_limit, 3), 1), 6);
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  return query
  with viewer_sets as (
    select distinct cp.set_id
    from public.vault_item_instances vii
    join public.card_prints cp on cp.id = vii.card_print_id
    where vii.user_id = v_uid
      and vii.archived_at is null
      and cp.set_id is not null
    union
    select distinct cp.set_id
    from public.wishlist_items wi
    join public.card_prints cp on cp.id = wi.card_id
    where wi.user_id = v_uid
      and cp.set_id is not null
  ),
  viewer_setting as (
    select
      s.area_label,
      s.region_code,
      s.country_code,
      s.geohash_prefix
    from public.collector_local_discovery_settings s
    where s.user_id = v_uid
      and s.local_discovery_enabled is true
    limit 1
  ),
  public_cards as (
    select distinct on (src.owner_user_id, src.card_print_id)
      src.owner_user_id,
      src.owner_display_name,
      src.owner_slug,
      src.card_print_id,
      src.display_image_url,
      src.created_at
    from (
      select
        w.owner_user_id,
        w.owner_display_name,
        w.owner_slug,
        w.card_print_id,
        w.display_image_url,
        w.created_at
      from public.v_wall_cards_v1 w
      union all
      select
        s.owner_user_id,
        s.owner_display_name,
        s.owner_slug,
        s.card_print_id,
        s.display_image_url,
        s.created_at
      from public.v_card_stream_v1 s
    ) src
    where src.owner_user_id <> v_uid
      and src.card_print_id is not null
      and public.local_community_collector_visible_to_viewer_v1(v_uid, src.owner_user_id) is true
    order by src.owner_user_id, src.card_print_id, src.created_at desc nulls last
  ),
  eligible_collectors as (
    select
      pc.owner_user_id,
      coalesce(nullif(btrim(max(pc.owner_display_name)), ''), nullif(btrim(max(pc.owner_slug)), ''), 'Collector') as display_name,
      case
        when nullif(btrim(max(pp.avatar_path)), '') ~* '^https?://' then nullif(btrim(max(pp.avatar_path)), '')
        else null::text
      end as avatar_url,
      max(os.area_label) as owner_area_label,
      max(os.region_code) as owner_region_code,
      max(os.country_code) as owner_country_code,
      max(os.geohash_prefix) as owner_geohash_prefix,
      count(*)::integer as public_card_count,
      count(*) filter (where cp.set_id in (select vs.set_id from viewer_sets vs))::integer as set_overlap_count,
      max(pc.created_at) as latest_activity_at,
      (array_remove(array_agg(pc.display_image_url order by pc.created_at desc nulls last), null))[1] as sample_image_url
    from public_cards pc
    join public.card_prints cp on cp.id = pc.card_print_id
    join public.public_profiles pp on pp.user_id = pc.owner_user_id
    left join public.collector_local_discovery_settings os
      on os.user_id = pc.owner_user_id
     and os.local_discovery_enabled is true
    where not exists (
      select 1
      from public.collector_follows cf
      where cf.follower_user_id = v_uid
        and cf.followed_user_id = pc.owner_user_id
    )
    group by pc.owner_user_id
  ),
  scored as (
    select
      ec.*,
      case
        when exists (
          select 1
          from viewer_setting vs
          where nullif(btrim(vs.geohash_prefix), '') is not null
            and nullif(btrim(ec.owner_geohash_prefix), '') is not null
            and vs.geohash_prefix = ec.owner_geohash_prefix
        ) then 2
        when exists (
          select 1
          from viewer_setting vs
          where nullif(btrim(vs.region_code), '') is not null
            and nullif(btrim(ec.owner_region_code), '') is not null
            and vs.region_code = ec.owner_region_code
            and coalesce(vs.country_code, '') = coalesce(ec.owner_country_code, '')
        ) then 1
        else 0
      end as proximity_rank
    from eligible_collectors ec
    where ec.set_overlap_count > 0 or ec.public_card_count > 0
  )
  select
    scored.owner_user_id as collector_user_id,
    scored.display_name,
    scored.avatar_url,
    case scored.proximity_rank
      when 2 then coalesce(nullif(btrim(scored.owner_area_label), ''), 'Nearby')
      when 1 then coalesce(nullif(btrim(scored.owner_area_label), ''), 'Same region')
      else null::text
    end as proximity_label,
    case
      when scored.set_overlap_count > 0 then
        case
          when scored.proximity_rank = 2 then 'Nearby · has cards from your wanted sets'
          when scored.proximity_rank = 1 then 'Same region · has cards from your wanted sets'
          else 'Has cards from your wanted sets'
        end
      when scored.proximity_rank = 2 then 'Nearby collector'
      when scored.proximity_rank = 1 then 'Same region collector'
      else 'Public collector overlap'
    end as overlap_summary,
    case
      when nullif(btrim(scored.sample_image_url), '') ~* '^https?://' then scored.sample_image_url
      else null::text
    end as sample_image_url,
    scored.public_card_count as sample_card_count
  from scored
  order by
    scored.set_overlap_count desc,
    scored.proximity_rank desc,
    scored.latest_activity_at desc nulls last,
    scored.owner_user_id
  limit v_limit;
end;
$$;

comment on function public.onboarding_collector_suggestions_v1(integer) is
'E6 collector suggestions RPC. Authenticated-only, reuses local_community_collector_visible_to_viewer_v1 and ranks by owned/wanted set overlap, proximity, and recent public activity. Excludes self and already-followed collectors; never ranks by follower count.';

revoke all on function public.onboarding_collector_suggestions_v1(integer) from public, anon;
grant execute on function public.onboarding_collector_suggestions_v1(integer) to authenticated, service_role;

commit;
