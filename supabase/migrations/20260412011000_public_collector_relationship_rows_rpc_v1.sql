begin;

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
security definer
set search_path = public
as $$
  with normalized as (
    select case lower(trim(coalesce(p_mode, '')))
      when 'followers' then 'followers'
      when 'following' then 'following'
      else null
    end as mode
  )
  select
    pp.user_id,
    pp.slug,
    coalesce(nullif(btrim(pp.display_name), ''), pp.slug) as display_name,
    pp.avatar_path,
    cf.created_at as followed_at
  from normalized n
  join public.collector_follows cf
    on n.mode is not null
  join public.public_profiles pp
    on pp.user_id = case
      when n.mode = 'followers' then cf.follower_user_id
      else cf.followed_user_id
    end
   and pp.public_profile_enabled = true
  where (
    n.mode = 'followers'
    and cf.followed_user_id = p_user_id
  ) or (
    n.mode = 'following'
    and cf.follower_user_id = p_user_id
  )
  order by cf.created_at desc, pp.user_id;
$$;

revoke all on function public.public_collector_relationship_rows_v1(uuid, text) from public;
grant execute on function public.public_collector_relationship_rows_v1(uuid, text) to anon;
grant execute on function public.public_collector_relationship_rows_v1(uuid, text) to authenticated;

commit;
