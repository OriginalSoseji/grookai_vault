-- PUBLIC_COLLECTOR_RELATIONSHIP_SECURITY_REPAIR_V1
-- Restore truthful public follower counts and relationship lists after the
-- broad SECURITY INVOKER hardening made inbound rows invisible through RLS.

begin;

create or replace function public.public_collector_follow_counts_v1(
  p_user_id uuid
)
returns table (
  following_count bigint,
  follower_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with target_access as (
    select exists (
      select 1
      from public.public_profiles pp
      where pp.user_id = p_user_id
        and (
          pp.public_profile_enabled = true
          or auth.uid() = p_user_id
        )
    ) as allowed
  )
  select
    case
      when ta.allowed then (
        select count(*)::bigint
        from public.collector_follows cf
        where cf.follower_user_id = p_user_id
      )
      else 0::bigint
    end as following_count,
    case
      when ta.allowed then (
        select count(*)::bigint
        from public.collector_follows cf
        where cf.followed_user_id = p_user_id
      )
      else 0::bigint
    end as follower_count
  from target_access ta;
$$;

create or replace function public.public_collector_relationship_rows_v1(
  p_user_id uuid,
  p_mode text
)
returns table (
  user_id uuid,
  slug text,
  display_name text,
  avatar_path text,
  followed_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with normalized as (
    select case pg_catalog.lower(pg_catalog.btrim(coalesce(p_mode, '')))
      when 'followers' then 'followers'
      when 'following' then 'following'
      else null
    end as mode
  ),
  target_access as (
    select exists (
      select 1
      from public.public_profiles target_profile
      where target_profile.user_id = p_user_id
        and (
          target_profile.public_profile_enabled = true
          or auth.uid() = p_user_id
        )
    ) as allowed
  )
  select
    related_profile.user_id,
    related_profile.slug,
    coalesce(
      nullif(pg_catalog.btrim(related_profile.display_name), ''),
      related_profile.slug
    ) as display_name,
    related_profile.avatar_path,
    cf.created_at as followed_at
  from normalized n
  cross join target_access ta
  join public.collector_follows cf
    on ta.allowed
   and n.mode is not null
  join public.public_profiles related_profile
    on related_profile.user_id = case
      when n.mode = 'followers' then cf.follower_user_id
      else cf.followed_user_id
    end
   and related_profile.public_profile_enabled = true
  where (
    n.mode = 'followers'
    and cf.followed_user_id = p_user_id
  ) or (
    n.mode = 'following'
    and cf.follower_user_id = p_user_id
  )
  order by cf.created_at desc, related_profile.user_id;
$$;

revoke all on function public.public_collector_follow_counts_v1(uuid) from public;
grant execute on function public.public_collector_follow_counts_v1(uuid) to anon;
grant execute on function public.public_collector_follow_counts_v1(uuid) to authenticated;
grant execute on function public.public_collector_follow_counts_v1(uuid) to service_role;

revoke all on function public.public_collector_relationship_rows_v1(uuid, text) from public;
grant execute on function public.public_collector_relationship_rows_v1(uuid, text) to anon;
grant execute on function public.public_collector_relationship_rows_v1(uuid, text) to authenticated;
grant execute on function public.public_collector_relationship_rows_v1(uuid, text) to service_role;

notify pgrst, 'reload schema';

commit;
